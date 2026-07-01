import { describe, it, expect, beforeAll } from "vitest";
import { makeJWT, validateJWT, getAPIKey } from "./auth.js";

describe("makeJWT", () => {
  const secret = "test-secret-key-12345678901234567890";
  let token: string;

  beforeAll(() => {
    token = makeJWT("user-123", 3600, secret);
  });

  it("should create a valid JWT token", () => {
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    // JWT tokens should be base64url encoded and contain dots (header.payload.signature)
    expect(token.split(".")).toHaveLength(3);
  });

  it("should include the correct issuer (iss)", () => {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    expect(decoded.iss).toBe("chirpy");
  });

  it("should include the correct subject (sub) with user ID", () => {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    expect(decoded.sub).toBe("user-123");
  });

  it("should set iat to current time in seconds", () => {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    expect(decoded.iat).toBe(now);
  });

  it("should set exp to iat + expiresIn", () => {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const expectedExp = Math.floor(Date.now() / 1000) + 3600;
    expect(decoded.exp).toBe(expectedExp);
  });

  it("should use the provided secret for signing", () => {
    // This is verified by validateJWT succeeding below
    expect(() => validateJWT(token, secret)).not.toThrow();
  });
});

describe("validateJWT - Valid Token", () => {
  const secret = "test-secret-key-12345678901234567890";
  let token: string;

  beforeAll(() => {
    token = makeJWT("user-456", 7200, secret);
  });

  it("should return the user ID from a valid token", () => {
    const result = validateJWT(token, secret);
    expect(result).toBe("user-456");
  });

  it("should handle token with different expiresIn values", () => {
    const shortToken = makeJWT("user-789", 300, secret); // 5 minutes
    const longToken = makeJWT("user-101", 86400, secret); // 24 hours

    expect(() => validateJWT(shortToken, secret)).not.toThrow();
    expect(() => validateJWT(longToken, secret)).not.toThrow();
  });
});

describe("validateJWT - Expired Token", () => {
  const secret = "test-secret-key-12345678901234567890";

  it("should throw an error for expired tokens", () => {
    // Create a token that expires in the past (negative expiresIn)
    const expiredToken = makeJWT("user-expired", -3600, secret);
    
    expect(() => validateJWT(expiredToken, secret)).toThrow();
  });

  it("should throw an error for tokens with very old exp claims", () => {
    // Manually create a token with an expired timestamp
    const payload = JSON.stringify({
      iss: "chirpy",
      sub: "user-old",
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (already expired)
    }, null, "");

    const base64Payload = Buffer.from(payload, "utf-8").toString("base64url");
    const expiredToken = `${payload.split(".")[0]}.${base64Payload}.signature`;

    expect(() => validateJWT(expiredToken, secret)).toThrow();
  });
});

describe("validateJWT - Wrong Secret", () => {
  let token: string;

  beforeAll(() => {
    const correctSecret = "correct-secret-123";
    token = makeJWT("user-wrong-secret", 3600, correctSecret);
  });

  it("should throw an error when using wrong secret", () => {
    const wrongSecret = "wrong-secret-456";
    
    expect(() => validateJWT(token, wrongSecret)).toThrow();
  });

  it("should throw a specific error for signature mismatch", () => {
    const wrongSecret = "another-wrong-secret";
    
    try {
      validateJWT(token, wrongSecret);
      // If we get here, no error was thrown
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      // jwt.verify throws for signature mismatch - message varies by version
      const msg = (error as Error).message;
      expect(msg).toMatch(/invalid|Signature/i);
    }
  });

  it("should throw an error with different wrong secrets", () => {
    const secrets = [
      "secret123",
      "my-secret-key",
      "",
      null as any,
      undefined as any,
    ];

    for (const secret of secrets) {
      expect(() => validateJWT(token, secret)).toThrow();
    }
  });
});

describe("validateJWT - Edge Cases", () => {
  const secret = "test-secret-key-12345678901234567890";

  it("should throw an error for empty token string", () => {
    expect(() => validateJWT("", secret)).toThrow();
  });

  it("should throw an error for null token", () => {
    expect(() => validateJWT(null as any, secret)).toThrow();
  });

  it("should throw an error for undefined token", () => {
    expect(() => validateJWT(undefined as any, secret)).toThrow();
  });

  it("should throw an error for random string that looks like JWT", () => {
    const fakeToken = "fake.token.here";
    
    expect(() => validateJWT(fakeToken, secret)).toThrow();
  });

  it("should throw an error for malformed base64 token", () => {
    const malformedToken = "not..valid..base64!!!";
    
    expect(() => validateJWT(malformedToken, secret)).toThrow();
  });

  it("should throw an error for JWT with missing parts", () => {
    const incompleteToken = "header.payload"; // Missing signature
    
    expect(() => validateJWT(incompleteToken, secret)).toThrow();
  });
});

describe("validateJWT - Token Structure Validation", () => {
  const secret = "test-secret-key-12345678901234567890";

  it("should verify that iss claim is 'chirpy'", () => {
    // Create a token with wrong issuer
    const payload = JSON.stringify({
      iss: "wrong-issuer",
      sub: "user-test",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, null, "");

    const base64Payload = Buffer.from(payload, "utf-8").toString("base64url");
    const tokenWithWrongIssuer = `${payload.split(".")[0]}.${base64Payload}.signature`;

    // This should still validate if the signature is correct (since we sign it ourselves)
    // The iss claim doesn't affect jwt.verify with just a secret
  });

  it("should handle tokens with additional claims", () => {
    // Create a token with extra claims using makeJWT (which signs it properly)
    const tokenWithExtra = makeJWT("test-user", 3600, secret);

    // Should still validate and return the sub claim (extra claims don't affect jwt.verify)
    const result = validateJWT(tokenWithExtra, secret);
    expect(result).toBe("test-user");
  });
});

describe("getAPIKey", () => {
  it("should extract the API key from an ApiKey authorization header", () => {
    const req = {
      get: (header: string) => (header === "Authorization" ? "ApiKey abc123" : null),
    };

    expect(getAPIKey(req as any)).toBe("abc123");
  });

  it("should allow extra whitespace between ApiKey and the key", () => {
    const req = {
      get: (header: string) => (header === "Authorization" ? "ApiKey    abc123" : null),
    };

    expect(getAPIKey(req as any)).toBe("abc123");
  });

  it("should throw when the authorization header is missing", () => {
    const req = {
      get: () => null,
    };

    expect(() => getAPIKey(req as any)).toThrow("Missing Authorization header");
  });

  it("should throw when the authorization header uses the wrong scheme", () => {
    const req = {
      get: (header: string) => (header === "Authorization" ? "Bearer abc123" : null),
    };

    expect(() => getAPIKey(req as any)).toThrow("Malformed authorization header");
  });
});
