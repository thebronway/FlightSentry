import net from 'net';
import { NextRequest } from 'next/server';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { authDb } from '@/db/auth';
import { settingsDb } from '@/db/settings';
import { AuthPasskeyPublic } from '@/types';

type RegistrationResponseJSON = Parameters<typeof verifyRegistrationResponse>[0]['response'];
type AuthenticationResponseJSON = Parameters<typeof verifyAuthenticationResponse>[0]['response'];
type CredentialTransports = NonNullable<
  NonNullable<Parameters<typeof generateRegistrationOptions>[0]['excludeCredentials']>[number]['transports']
>;

const RP_NAME = 'FlightSentry';
const WEBAUTHN_TIMEOUT_MS = 60_000;

interface RpContext {
  rpID: string;
  origin: string;
  expectedOrigins: string[];
  expectedRPIDs: string[];
}

function parseHostname(hostHeader: string): string {
  const trimmed = hostHeader.trim();
  if (trimmed.startsWith('[')) {
    const endIdx = trimmed.indexOf(']');
    return endIdx > 0 ? trimmed.slice(0, endIdx + 1) : trimmed;
  }
  const colonIdx = trimmed.indexOf(':');
  return colonIdx > 0 ? trimmed.slice(0, colonIdx) : trimmed;
}

function isIpAddressHost(hostname: string): boolean {
  if (!hostname) return false;
  const stripped = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  return net.isIP(stripped) !== 0;
}

function tryParseUrl(raw?: string | null): URL | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function resolveWebAuthnRpContext(req: NextRequest): RpContext {
  const forwardedHost = (req.headers.get('x-forwarded-host') || '').split(',')[0].trim();
  const hostHeader = (req.headers.get('host') || '').trim();
  const forwardedProto = (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  const originUrl = tryParseUrl(req.headers.get('origin'));

  let configuredAppUrl: URL | null = null;
  try {
    const settings = settingsDb.get();
    configuredAppUrl = tryParseUrl(settings?.appBaseUrl);
  } catch {
    // Ignore optional appBaseUrl lookup errors
  }

  const proto =
    forwardedProto === 'https' || forwardedProto === 'http'
      ? forwardedProto
      : originUrl
      ? originUrl.protocol.replace(':', '')
      : configuredAppUrl
      ? configuredAppUrl.protocol.replace(':', '')
      : req.nextUrl.protocol.replace(':', '') || 'http';

  const hostCandidates = [
    forwardedHost,
    hostHeader,
    originUrl?.host || '',
    configuredAppUrl?.host || '',
    req.nextUrl.host || '',
  ].filter(Boolean);

  const nonIpHost = hostCandidates.find((candidate) => !isIpAddressHost(parseHostname(candidate)));
  const selectedHost = nonIpHost || hostCandidates[0] || 'localhost';
  const rpID = parseHostname(selectedHost) || 'localhost';

  if (isIpAddressHost(rpID)) {
    throw new Error(
      `Passkeys cannot be used with a raw IP address (${rpID}). Configure your reverse proxy to pass X-Forwarded-Host / Host (or set Application Base URL in Settings) and access FlightSentry via https://<your-domain>.`
    );
  }

  const origin =
    originUrl && !isIpAddressHost(originUrl.hostname)
      ? originUrl.origin
      : `${proto}://${selectedHost}`;

  const expectedOrigins = new Set<string>([origin]);
  const expectedRPIDs = new Set<string>([rpID]);

  if (configuredAppUrl && !isIpAddressHost(configuredAppUrl.hostname)) {
    expectedOrigins.add(configuredAppUrl.origin);
    expectedRPIDs.add(configuredAppUrl.hostname);
  }

  return {
    rpID,
    origin,
    expectedOrigins: Array.from(expectedOrigins),
    expectedRPIDs: Array.from(expectedRPIDs),
  };
}

function parseTransports(raw?: string | null): CredentialTransports | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CredentialTransports) : undefined;
  } catch {
    return undefined;
  }
}

export async function createPasskeyRegistrationOptions(req: NextRequest) {
  const config = authDb.getConfig();
  if (config.enabled !== 1) {
    throw new Error('Enable username and password authentication before registering a passkey.');
  }

  const { rpID } = resolveWebAuthnRpContext(req);
  const existingPasskeys = authDb.listPasskeys();

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: config.username,
    userDisplayName: `FlightSentry (${config.username})`,
    timeout: WEBAUTHN_TIMEOUT_MS,
    attestationType: 'none',
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: parseTransports(pk.transports),
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  authDb.storeWebAuthnChallenge(options.challenge, 'registration');
  return options;
}

export async function verifyAndSavePasskeyRegistration(
  req: NextRequest,
  name: string,
  responsePayload: unknown
): Promise<AuthPasskeyPublic> {
  const config = authDb.getConfig();
  if (config.enabled !== 1) {
    throw new Error('Enable username and password authentication before registering a passkey.');
  }

  const response = responsePayload as RegistrationResponseJSON;
  const { expectedOrigins, expectedRPIDs } = resolveWebAuthnRpContext(req);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: (challenge: string) =>
      authDb.consumeWebAuthnChallenge(challenge, 'registration'),
    expectedOrigin: expectedOrigins,
    expectedRPID: expectedRPIDs,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Passkey registration could not be verified.');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const duplicate = authDb.getPasskeyByCredentialId(credential.id);
  if (duplicate) {
    throw new Error('This passkey is already registered.');
  }

  const transportsJson =
    credential.transports && credential.transports.length > 0
      ? JSON.stringify(credential.transports)
      : null;

  const saved = authDb.createPasskey({
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
    transports: transportsJson,
    deviceType: credentialDeviceType || null,
    backedUp: Boolean(credentialBackedUp),
    name,
  });

  return {
    id: saved.id,
    credentialId: saved.credentialId,
    deviceType: saved.deviceType || null,
    backedUp: saved.backedUp === 1,
    name: saved.name,
    createdAt: saved.createdAt,
    lastUsedAt: saved.lastUsedAt || null,
  };
}

export async function createPasskeyAuthenticationOptions(req: NextRequest) {
  const config = authDb.getConfig();
  if (config.enabled !== 1) {
    throw new Error('Authentication is currently disabled.');
  }

  const passkeys = authDb.listPasskeys();
  if (passkeys.length === 0) {
    throw new Error('No passkeys are registered on this instance.');
  }

  const { rpID } = resolveWebAuthnRpContext(req);
  const options = await generateAuthenticationOptions({
    rpID,
    timeout: WEBAUTHN_TIMEOUT_MS,
    allowCredentials: passkeys.map((pk) => ({
      id: pk.credentialId,
      transports: parseTransports(pk.transports),
    })),
    userVerification: 'preferred',
  });

  authDb.storeWebAuthnChallenge(options.challenge, 'authentication');
  return options;
}

export async function verifyPasskeyAuthentication(
  req: NextRequest,
  responsePayload: unknown
): Promise<{ username: string; passkeyName: string }> {
  const config = authDb.getConfig();
  if (config.enabled !== 1) {
    throw new Error('Authentication is currently disabled.');
  }

  const response = responsePayload as AuthenticationResponseJSON;
  const credentialId = response?.id;
  if (!credentialId || typeof credentialId !== 'string') {
    throw new Error('Missing passkey credential identifier.');
  }

  const storedPasskey = authDb.getPasskeyByCredentialId(credentialId);
  if (!storedPasskey) {
    throw new Error('Unrecognized passkey credential.');
  }

  const { expectedOrigins, expectedRPIDs } = resolveWebAuthnRpContext(req);
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: (challenge: string) =>
      authDb.consumeWebAuthnChallenge(challenge, 'authentication'),
    expectedOrigin: expectedOrigins,
    expectedRPID: expectedRPIDs,
    credential: {
      id: storedPasskey.credentialId,
      publicKey: new Uint8Array(Buffer.from(storedPasskey.publicKey, 'base64')),
      counter: storedPasskey.counter,
      transports: parseTransports(storedPasskey.transports),
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    throw new Error('Passkey authentication failed.');
  }

  authDb.updatePasskeyUsage(storedPasskey.id, verification.authenticationInfo.newCounter);

  return {
    username: config.username,
    passkeyName: storedPasskey.name,
  };
}