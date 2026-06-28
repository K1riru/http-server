import * as argon2 from "argon2";
export function hashPassword(password: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, password);
}