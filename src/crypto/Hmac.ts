import * as crypto from "crypto";
import * as utf8 from "@stablelib/utf8";
import { hmac } from "@stablelib/hmac";
import { SHA512 } from "@stablelib/sha512";
import { SHA384 } from "@stablelib/sha384";
import { SHA256 } from "@stablelib/sha256";

export enum HashAlgorithm {
  Sha256 = "SHA-256",
  Sha384 = "SHA-384",
  Sha512 = "SHA-512",
}

export class Hmac {
    public static async hash(
        algorithm: HashAlgorithm,
        secretKey: Uint8Array | string,
        data: Uint8Array | string
    ): Promise<Uint8Array> {
        const key =
      typeof secretKey === "string" ? utf8.encode(secretKey) : secretKey;
        const value = typeof data === "string" ? utf8.encode(data) : data;

        if (typeof window !== "undefined") {
            // Try SubtleCrypto if it exists, otherwise fallback to @stablelibs/Hmac
            try {
                const key_ = await window!.crypto.subtle.importKey(
                    "raw",
                    key,
                    {
                        name: "HMAC",
                        hash: algorithm
                    },
                    false,
                    [ "sign" ]
                );

                return new Uint8Array(await window!.crypto.subtle.sign("HMAC", key_, value));
            } catch {
                switch (algorithm) {
                    case HashAlgorithm.Sha256:
                        return hmac(SHA256, key, value);
                    case HashAlgorithm.Sha384:
                        return hmac(SHA384, key, value);
                    case HashAlgorithm.Sha512:
                        return hmac(SHA512, key, value);
                    default:
                        throw new Error("(BUG) Non-Exhaustive switch statement for algorithms");
                }
            }
        }

        switch (algorithm) {
            case HashAlgorithm.Sha256:
                return crypto.createHmac("SHA256", key).update(value).digest();
            case HashAlgorithm.Sha384:
                return crypto.createHmac("SHA384", key).update(value).digest();
            case HashAlgorithm.Sha512:
                return crypto.createHmac("SHA512", key).update(value).digest();
            default:
                throw new Error("(BUG) Non-Exhaustive switch statement for algorithms");
        }
    }
}
