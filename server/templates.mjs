import fs from "fs";
import path from "path";
import handlebars from "handlebars";
const templateDir = path.join(path.resolve(), "public", "templates");
for(let i of fs.readdirSync(templateDir)) {
	const read = fs.readFileSync(path.join(templateDir, i), "utf8");
	handlebars.registerPartial(i.slice(0, -path.extname(i).length), read);
}

export default function(name, data = { title: name }) {
	return handlebars.compile(`{{> ${name} }}`)(data);
}
