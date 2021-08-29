import http from "http";
import fs from "fs";
import path from "path";
const normal = (...p) => path.resolve(path.join(...p));

function prepare(route) {
	const parts = [""];
	for (let i of route) {
		if (i === ':' || i === '/') {
			parts.push(i);
		} else if (i === '*') {
			parts.push(i, "");
		} else {
			parts[parts.length - 1] += i;
		}
	}
	return parts.filter((i) => i);
}

function parse(route, url) {
	const data = { path: [] };
	for (let i = 0; i < route.length; i++) {
		const part = route[i];
		if (part === '*' || part[0] === ':') {
			let index = url.indexOf('/');
			if(index < 0) index = url.length;
			const slice = url.slice(0, index);
			if(part === '*') {
				data.path.push(slice);
			} else {
				data[part.slice(1)] = slice;
			}
			url = url.slice(index);
		} else if (url.startsWith(part)) {
			url = url.slice(part.length);
		} else {
			return null;
		}
	}
	if(url.length) return null;
	return data;
}

function dir(route, files) {
	const css = "<style>body{font-family:monospace;padding:1em;}</style>";
	const link = (i) => `<a href="${normal(route, i)}">${i}</a><br />`;
	return { data: css + files.map(link).join("\n"), type: "text/html" };
}

export default class Server {
	constructor() {
		this.server = http.createServer(this.handle.bind(this));
		this.handlers = [];
		this.map = new Map();
	}

	handle(req, res) {
		const method = req.method.toUpperCase();
		const url = normal('/', req.url);
		if (this.map.has(url)) {
			const file = this.map.get(url);
			if (file.type) {
				res.writeHead(200, { "Content-Type": file.type });
			} else {
				res.writeHead(200);
			}
			return res.end(file.data);
		}

		for (let handler of this.handlers) {
			if (handler.method !== method) continue;
			const parsed = parse(handler.route, url);
			if (parsed) return handler.call(req, res, parsed);
		}
	}

	static(file, route) {
		if (!fs.existsSync(file)) throw "file doesn't exist!";
		const stat = fs.statSync(file);
		route = normal('/', route);
		if (stat.isDirectory()) {
			// show a directory listing
			const files = fs.readdirSync(file);
			this.map.set(route, dir(route, files));
			for (let i of files) this.static(normal(file, i), normal(route, i));
		} else if (stat.size > 1000 * 1000 * 8) {
			// stream files that are larger than 8 mb
			this.get(route, (req, res) => fs.createReadStream(file).pipe(res));
		} else {
			// statically host a file
			const type = Server.types[path.extname(file).slice(1)] || null;
			this.map.set(route, { data: fs.readFileSync(file), type: type });
		}
		return this;
	}

	route(method, route, call) {
		this.handlers.push({
			method: method.toUpperCase(),
			route: prepare(normal('/', route)),
			call,
		});
		return this;
	}

	get(route, call) { return this.route("GET", route, call) }
	post(route, call) { return this.route("POST", route, call) }
	put(route, call) { return this.route("PUT", route, call) }
	patch(route, call) { return this.route("PATCH", route, call) }
	delete(route, call) { return this.route("DELETE", route, call) }
	listen(port, call) { this.server.listen(port, call) }

	static types = {
		html: "text/html",
		css:  "text/css",
		js:   "text/javascript",
		json: "application/json",
		png:  "image/png",
		jpeg: "image/jpeg",
		jpg:  "image/jpeg",
		gif:  "image/gif",
		mp3:  "audio/mp3",
		ogg:  "audio/ogg",
		wav:  "audio/wav",
		avi:  "video/avi",
		mp4:  "video/mp4",
	};
}
