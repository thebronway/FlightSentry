export const schema = `
CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departureDate TEXT NOT NULL,
    airline TEXT NOT NULL,
    flightNumber TEXT NOT NULL,
    pnr TEXT,
    fareTier TEXT NOT NULL,
    baselinePrice REAL NOT NULL,
    targetPrice REAL,
    currentPrice REAL NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flightId INTEGER NOT NULL,
    price REAL NOT NULL,
    status TEXT NOT NULL,
    checkedAt TEXT NOT NULL,
    FOREIGN KEY (flightId) REFERENCES flights(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    serpApiKey TEXT,
    appriseUrl TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    checkHours TEXT NOT NULL DEFAULT '[8, 16]',
    minDropDollar REAL NOT NULL DEFAULT 15.0,
    minDropPercent REAL NOT NULL DEFAULT 5.0,
    monthlyQuota INTEGER NOT NULL DEFAULT 100,
    apiSearchesUsed INTEGER NOT NULL DEFAULT 0,
    quotaResetDate TEXT NOT NULL,
    globalPause INTEGER NOT NULL DEFAULT 0
);
`;