import fs from "fs";
import path from "path";
import * as crypto from "./crypto.mjs";
import Database from "better-sqlite3";
const dataPath = path.join(path.resolve(), "data");
const dbPath = path.join(dataPath, "data.db");

// init database
const dbExists = fs.existsSync(dbPath); 
if(!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);
const db = new Database(dbPath, { verbose: process.env.DEV ? console.error : null });
if(!dbExists) {
	db.exec("CREATE TABLE Users (name TEXT PRIMARY KEY, description TEXT, email TEXT, password TEXT, salt TEXT, pfp BLOB, created INTEGER)");
	db.exec("CREATE TABLE Posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, tags TEXT, created INTEGER)");
	db.exec("CREATE TABLE Files (hash TEXT PRIMARY KEY, name TEXT, uploader TEXT, created INTEGER)");
}

// prepared sql queries
const sql = {
	user: {
		create: db.prepare("INSERT INTO Users (name, password, salt, created) VALUES (?, ?, ?, ?)"),
		update: db.prepare("UPDATE Users SET password=?, salt=? WHERE name=?"),
		get:    db.prepare("SELECT * FROM Users WHERE name=?"),
		delete: db.prepare("DELETE FROM Users WHERE name=?"),
	},
	posts: {},
	files: {
		get:    db.prepare("SELECT * FROM Files WHERE hash=?"),
		add:    db.prepare("INSERT INTO Files (hash, name, created) VALUES (?, ?, ?)"),
	},
}

export class Users {
	static create(username, password) {
		if(this.get(username)) throw "user.nametaken";
		const salt = crypto.genSalt();
		const hash = crypto.hashWithSalt(password, salt);
		sql.user.create.run(username, hash, salt, Date.now());
		return "user.created";
	}
	
	static updatePass(username, oldpass, password) {
		if(!this.auth(username, oldpass)) throw "username.badpass";
		const salt = crypto.genSalt();
		const hash = crypto.hashWithSalt(password, salt);
		sql.user.update.run(hash, salt, username);
		return "user.updated";
	}

	static auth(username, password) {
		const user = this.get(username);
		if(!user) return false;
		if(crypto.compare(password, user.password, user.salt)) return true;
		return false;
	}

	static get(username) {
		return sql.user.get.get(username);
	}

	// update(username, key, value) {
		// return run(`UPDATE Users SET ${key}=? WHERE name=?`, [value, username]);
	// }

	static delete(username, password) {
		if(!this.auth(username, password)) throw "username.badpass";
		return sql.user.delete.run(username);
	}
}

export class Posts {
	// TODO
}

export class Files {
	static async upload(stream, name) {
		const hash = crypto.genHash();
		const tmpName = path.join(dataPath, Math.random().toString(36).slice(3, 8));
		const file = fs.createWriteStream(tmpName);
		return new Promise(res => {
			stream.on("data", chunk => {
				file.write(chunk);
				hash.update(chunk);
			});
			stream.on("end", () => {
				const digest = hash.digest().toString("hex");
				if(sql.files.get.get(digest)) {
					fs.rmSync(tmpName);
				} else {
					fs.renameSync(tmpName, path.join(dataPath, digest));
					sql.files.add.run(digest, name, Date.now());
				}
				res(digest);
			});
		});
	}

	static fetch(hash) {
		const info = sql.files.get.get(hash);
		return { ...info, stream: fs.createReadStream(path.join(dataPath, hash)) };
	}
}
