"use strict";

const cluster = require("cluster");
const os = require("os");
const util = require("util");
const fs = require("fs");
const http = require("http");

const log = (...messages) => {
	const date = new Date;
	console.log([[date.getHours(), date.getMinutes(), date.getSeconds()].map(a => a.toString().padStart(2, "0")).join(":")].concat(messages).join(" "));
};

const port = process.argv[2] || 8080;
const [path] = process.argv[1].match(/.*(?=(?:[\\\/].*){2})|.*(?=[\\\/].*)/u);

if(cluster.isMaster){
	let date0;
	setInterval(() => {
		const date = new Date;
		if(date0 !== (date0 = [date.getFullYear(), (date.getMonth() + 1).toString().padStart(2, "0"), date.getDate().toString().padStart(2, "0")].join("/"))) console.log(date0);
	});
	process.title = process.argv.slice(1).join(" ");
	process.chdir(path);
	return os.cpus().forEach(cluster.fork);
}

http.createServer(async (request, response) => {
	let url;
	const {headers, method} = {url} = request;
	log(method, url);
	if(headers["origin"]) response.setHeader("Access-Control-Allow-Origin", "*");
	if(method !== "GET"){
		response.writeHead(method === "OPTIONS" ? 204 : 400);
		return response.end();
	}
	let pathname;
	let pathname1;
	let fd;
	try{
		url = decodeURI(url);
		[pathname] = url.match(/[^?]*/u);
		pathname1 = pathname.endsWith("/") ? pathname + "index.html" : pathname;
		const filename = path + pathname1;
		fd = await util.promisify(fs.open)(filename, "r");
		const stat = await util.promisify(fs.stat)(filename);
		if(!stat.isFile()) throw null;
		const tag = [(+stat.ctime).toString(36), stat.size.toString(36)].join(".");
		response.on("end", () => fs.close(fd));
		if(headers["if-none-match"] === tag){
			response.writeHead(304);
			return response.end();
		}
		response.setHeader("ETag", tag);
		response.setHeader("Last-Modified", stat.mtime.toGMTString());
		let status;
		const range = (headers["range"] || "").match(/^\s*bytes\s*=\s*(\d+)\s*-\s*(\d+)?\s*$/i);
		const options = {};
		if(range && (!("if-match" in headers) || headers["if-match"] === tag)){
			options.end = Math.min(range[2] || Infinity, stat.size - 1);
			options.start = Math.min(range[1], options.end);
			response.setHeader("Content-Range", "bytes " + options.start + "-" + options.end + "/" + stat.size);
			response.setHeader("Content-Length", options.end - options.start + 1);
			status = 206;
		}else{
			response.setHeader("Accept-Range", "bytes");
			response.setHeader("Content-Length", stat.size);
			response.setHeader("Content-Type", "application/octet-stream");
			status = 200;
		}
		if(pathname1.endsWith(".html")) response.setHeader("Content-Type", "text/html");
		response.writeHead(status);
		try{
			fs.createReadStream(filename, options).pipe(response).on("error", () => response.end());
			return log(filename);
		}catch(error){}
		return response.end();
	}catch(error){}
	if(fd !== undefined) fs.close(fd);
	const filename = path + "/404.html";
	try{
		const content =
			pathname === pathname1
			? await util.promisify(fs.readFile)(filename)
			: '\u{feff}<body onload=\'(a=location).replace("' + encodeURI(pathname1 + url.slice(pathname.length)) + '"+a.hash)\'>';
		response.writeHead(404, {"Content-Type": "text/html"});
		response.end(content);
		return pathname === pathname1 && log(filename);
	}catch(error){}
	response.writeHead(404, {"Content-Type": "application/octet-stream"});
	response.end();
}).listen(port);
log("Listening on", +port);
