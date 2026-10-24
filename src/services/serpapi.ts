export interface SerpApiResult {
  price: number | null;
  status: 'Success' | 'SoldOut' | 'Error';
}

export const checkFlightPrice = async (
  apiKey: string | null | undefined,
  origin: string,
  destination: string,
  date: string,
  airline: string,
  flightNumber: string
): Promise<SerpApiResult> => {
  if (!apiKey) {
    console.error("SerpApi key is missing or not configured.");
    return { price: null, status: 'Error' };
  }

  try {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.append('engine', 'google_flights');
    url.searchParams.append('departure_id', origin);
    url.searchParams.append('arrival_id', destination);
    url.searchParams.append('outbound_date', date);
    url.searchParams.append('type', '2');
    url.searchParams.append('currency', 'USD');
    url.searchParams.append('hl', 'en');
    url.searchParams.append('api_key', apiKey);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`SerpApi error: ${response.status} ${response.statusText}`);
      return { price: null, status: 'Error' };
    }

    const data = await response.json();

    const bestFlights = data.best_flights || [];
    const otherFlights = data.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    const targetFlight = allFlights.find((f: any) => {
      const flightData = f.flights?.[0];
      if (!flightData) return false;

      const apiAirline = flightData.airline?.toLowerCase();
      const apiFlightNumber = flightData.flight_number?.toString().toLowerCase();

      return (
        apiAirline?.includes(airline.toLowerCase()) && 
        apiFlightNumber === flightNumber.toLowerCase()
      );
    });

    if (targetFlight && targetFlight.price) {
      return { price: targetFlight.price, status: 'Success' };
    }

    return { price: null, status: 'SoldOut' };
  } catch (error) {
    console.error("Error fetching from SerpApi:", error);
    return { price: null, status: 'Error' };
  }
};