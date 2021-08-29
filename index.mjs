import Server from "./server/router.mjs"
import render from "./server/templates.mjs"
import { Users } from "./server/data.mjs"
import * as util from "./server/util.mjs"
const srv = new Server();
const sessions = new util.SessionList();

// helpers
const head = (res, status, data = {}) => res.writeHead(status, { "Content-Type": "text/html", ...data });
const resOK = res => head(res, 200);
const resREDIR = (res, loc) => head(res, 302, { "Location": loc });
const resBAD = (res) => head(res, 400);
const resERR = (res) => head(res, 500);

function anonOnly(page) {
	return (req, res) => {
		if(sessions.isValid(util.parseCookies(req)?.session)) {
			resREDIR(res, "/").end();
		} else {
			resOK(res).end(render(page));
		}
	};
}

// main routes
srv.post("signup", async (req, res) => {
	const args = await util.readForm(req);
	try {
		// sanity check
		if(args.password !== args.pconfirm) throw "user.passnomatch";
		if(args.password.length === 0) throw "user.missingpass";
		if(args.username.length < 2) throw "user.nametooshort";
		if(args.username.length > 64) throw "user.nametoolong";
		if(!/^[a-z0-9_-]+$/i.test(args.username)) throw "user.badname";

		// create user
		Users.create(args.username, args.password);

		// make a new session
		const session = util.genUUID();
		sessions.login(args.username, session);
		resREDIR(res.setHeader("Set-Cookie", `session=${session}`), "/").end();
	} catch(error) {
		if(typeof error === "string") {
			resBAD(res).end(render("signup", { error, title: "signup" }));
		} else {
			resERR(res).end("server.error");
		}
	}
});

srv.post("login", async (req, res) => {
	const args = await util.readForm(req);
	try {
		// auth user
		if(!Users.auth(args.username, args.password)) throw "user.badauth";

		// make a new session
		const session = util.genUUID();
		sessions.login(args.username, session);
		resREDIR(res.setHeader("Set-Cookie", `session=${session}`), "/").end();
	} catch(error) {
		if(typeof error === "string") {
			resBAD(res).end(render("login", { error, title: "login" }));
		} else {
			resERR(res).end("server.error");
		}
	}
})

srv.get("/", (req, res) => {
	const name = sessions.getName(util.parseCookies(req)?.session);
	resOK(res).end(render("index", { title: "hello", name }));
});

srv.get("login", anonOnly("login"));
srv.get("signup", anonOnly("signup"));
srv.static("public/style.css", "/style.css");
srv.listen(3000, () => console.log(`Listening @ http://localhost:3000!`));

