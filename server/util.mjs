import { decode } from "querystring";
export { decode as decodeQuery } from "querystring";
export { genSalt as genUUID } from "./crypto.mjs";

export async function readForm(req) {
	return new Promise(res => {
		let data = "";
		req.on("data", d => data += d);
		req.on("end", () => res(decode(data)));
	});
}

export function parseCookies(req) {
	return req.headers.cookie?.split(";").reduce((obj, i) => {
		const [key, value] = i.trim().split("="); 
		obj[key] = value;
		return obj;
	}, {});
}

export class SessionList {
	constructor(maxAge = 1000 * 60) {
		this.maxAge = maxAge;
		this.names = new Map();
	}

	login(username, id) {
		const timeout = setTimeout(() => this.names.delete(id), this.maxAge);
		this.names.set(id, { username, timeout });
	}
	
	logout(id) {
		if(!this.isValid(id)) return;
		clearTimeout(this.names.get(id).timeout);
		this.names.delete(id);
	}
	
	isValid(id) {
		return this.names.has(id);
	}

	getName(id) {
		return this.names.get(id)?.username;
	}
}
