// wrapper around node crypto
import * as crypto from "crypto";

export function genSalt() {
	return crypto.randomBytes(3 * 8).toString("base64");
}

export function genHash() {
	return crypto.createHash("sha256");
}

export function calcHash(data) {
	for(let i = 0; i < 10000; i++) {
		data = genHash().update(data).digest();
	}
	return data;
}

export function hashWithSalt(password, salt) {
	return calcHash(password + salt);
}

export function compare(password, hash, salt) {
	return crypto.timingSafeEqual(hashWithSalt(password, salt), hash);
}
