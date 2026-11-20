import db from './index';
import { EmailQueueItem } from '../types';

export const emailQueueDb = {
  listPending: (): EmailQueueItem[] => {
    return db
      .prepare("SELECT * FROM email_queue WHERE status = 'pending' ORDER BY createdAt DESC, id DESC")
      .all() as EmailQueueItem[];
  },

  countPending: (): number => {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM email_queue WHERE status = 'pending'")
      .get() as { count: number } | undefined;
    return row?.count ?? 0;
  },

  getById: (id: number): EmailQueueItem | undefined => {
    return db
      .prepare('SELECT * FROM email_queue WHERE id = ?')
      .get(id) as EmailQueueItem | undefined;
  },

  getByIds: (ids: number[]): EmailQueueItem[] => {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    return db
      .prepare(`SELECT * FROM email_queue WHERE id IN (${placeholders}) ORDER BY createdAt ASC, id ASC`)
      .all(...ids) as EmailQueueItem[];
  },

  isMessageSeen: (messageId: string): boolean => {
    const row = db
      .prepare('SELECT 1 FROM email_seen_messages WHERE messageId = ?')
      .get(messageId);
    return Boolean(row);
  },

  markMessageSeen: (messageId: string, accountId: number): void => {
    db.prepare(`
      INSERT OR IGNORE INTO email_seen_messages (messageId, accountId, processedAt)
      VALUES (?, ?, ?)
    `).run(messageId, accountId, new Date().toISOString());
  },

  hasActiveDedupeKey: (dedupeKey: string): boolean => {
    const row = db
      .prepare("SELECT 1 FROM email_queue WHERE dedupeKey = ? AND status IN ('pending', 'applied')")
      .get(dedupeKey);
    return Boolean(row);
  },

  enqueue: (
    item: Omit<EmailQueueItem, 'id' | 'status' | 'createdAt' | 'resolvedAt'>
  ): number => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO email_queue (
        accountId, accountLabel, messageId, emailSubject, emailFrom, emailDate,
        eventType, dedupeKey, pnr, airline, flightNumber, origin, destination,
        departureDate, departureTime, arrivalTime, cabinClass, fareTier,
        price, currency, isPoints, taxesAmount, taxesCurrency, transactionDate,
        matchedFlightId, confidence, parserSource,
        status, createdAt, resolvedAt
      ) VALUES (
        @accountId, @accountLabel, @messageId, @emailSubject, @emailFrom, @emailDate,
        @eventType, @dedupeKey, @pnr, @airline, @flightNumber, @origin, @destination,
        @departureDate, @departureTime, @arrivalTime, @cabinClass, @fareTier,
        @price, @currency, @isPoints, @taxesAmount, @taxesCurrency, @transactionDate,
        @matchedFlightId, @confidence, @parserSource,
        'pending', @now, NULL
      )
    `);
    const result = stmt.run({
      accountId: item.accountId,
      accountLabel: item.accountLabel,
      messageId: item.messageId ?? null,
      emailSubject: item.emailSubject ? item.emailSubject.slice(0, 300) : null,
      emailFrom: item.emailFrom ? item.emailFrom.slice(0, 255) : null,
      emailDate: item.emailDate ?? null,
      eventType: item.eventType,
      dedupeKey: item.dedupeKey,
      pnr: item.pnr ?? null,
      airline: item.airline ?? null,
      flightNumber: item.flightNumber ?? null,
      origin: item.origin ?? null,
      destination: item.destination ?? null,
      departureDate: item.departureDate ?? null,
      departureTime: item.departureTime ?? null,
      arrivalTime: item.arrivalTime ?? null,
      cabinClass: item.cabinClass ?? null,
      fareTier: item.fareTier ?? null,
      price: item.price ?? null,
      currency: item.currency ?? null,
      isPoints: item.isPoints ? 1 : 0,
      taxesAmount: item.taxesAmount ?? null,
      taxesCurrency: item.taxesCurrency ?? null,
      transactionDate: item.transactionDate ?? null,
      matchedFlightId: item.matchedFlightId ?? null,
      confidence: item.confidence || 'medium',
      parserSource: item.parserSource || 'heuristic',
      now,
    });
    return result.lastInsertRowid as number;
  },

  updateFields: (
    id: number,
    fields: Partial<
      Pick<
        EmailQueueItem,
        | 'eventType'
        | 'pnr'
        | 'airline'
        | 'flightNumber'
        | 'origin'
        | 'destination'
        | 'departureDate'
        | 'departureTime'
        | 'arrivalTime'
        | 'cabinClass'
        | 'fareTier'
        | 'price'
        | 'currency'
        | 'isPoints'
        | 'taxesAmount'
        | 'taxesCurrency'
        | 'transactionDate'
        | 'matchedFlightId'
      >
    >
  ): void => {
    const existing = emailQueueDb.getById(id);
    if (!existing) return;

    const merged = {
      id,
      eventType: fields.eventType !== undefined ? fields.eventType : existing.eventType,
      pnr: fields.pnr !== undefined ? fields.pnr : existing.pnr,
      airline: fields.airline !== undefined ? fields.airline : existing.airline,
      flightNumber: fields.flightNumber !== undefined ? fields.flightNumber : existing.flightNumber,
      origin: fields.origin !== undefined ? fields.origin : existing.origin,
      destination: fields.destination !== undefined ? fields.destination : existing.destination,
      departureDate: fields.departureDate !== undefined ? fields.departureDate : existing.departureDate,
      departureTime: fields.departureTime !== undefined ? fields.departureTime : existing.departureTime,
      arrivalTime: fields.arrivalTime !== undefined ? fields.arrivalTime : existing.arrivalTime,
      cabinClass: fields.cabinClass !== undefined ? fields.cabinClass : existing.cabinClass,
      fareTier: fields.fareTier !== undefined ? fields.fareTier : existing.fareTier,
      price: fields.price !== undefined ? fields.price : existing.price,
      currency: fields.currency !== undefined ? fields.currency : existing.currency,
      isPoints: fields.isPoints !== undefined ? (fields.isPoints ? 1 : 0) : existing.isPoints,
      taxesAmount: fields.taxesAmount !== undefined ? fields.taxesAmount : existing.taxesAmount,
      taxesCurrency: fields.taxesCurrency !== undefined ? fields.taxesCurrency : existing.taxesCurrency,
      transactionDate:
        fields.transactionDate !== undefined ? fields.transactionDate : existing.transactionDate,
      matchedFlightId:
        fields.matchedFlightId !== undefined ? fields.matchedFlightId : existing.matchedFlightId,
    };

    db.prepare(`
      UPDATE email_queue SET
        eventType = @eventType,
        pnr = @pnr,
        airline = @airline,
        flightNumber = @flightNumber,
        origin = @origin,
        destination = @destination,
        departureDate = @departureDate,
        departureTime = @departureTime,
        arrivalTime = @arrivalTime,
        cabinClass = @cabinClass,
        fareTier = @fareTier,
        price = @price,
        currency = @currency,
        isPoints = @isPoints,
        taxesAmount = @taxesAmount,
        taxesCurrency = @taxesCurrency,
        transactionDate = @transactionDate,
        matchedFlightId = @matchedFlightId
      WHERE id = @id
    `).run(merged);
  },

  markApplied: (id: number): void => {
    db.prepare(`
      UPDATE email_queue SET status = 'applied', resolvedAt = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
  },

  markDenied: (id: number): void => {
    db.prepare(`
      UPDATE email_queue SET status = 'denied', resolvedAt = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
  },

  pruneOldSeenMessages: (olderThanDays = 90): number => {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600 * 1000).toISOString();
    const info = db
      .prepare('DELETE FROM email_seen_messages WHERE processedAt < ?')
      .run(cutoff);
    return info.changes;
  },
};