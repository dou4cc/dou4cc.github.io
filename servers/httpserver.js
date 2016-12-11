'use strict';

const Cluster=require('cluster');

if(Cluster.isMaster){
	const OS=require('os');

	process.title=process.argv.slice(1).join(' ');
	process.chdir(process.argv[1].match(/^[^\\]+(\\[^\\]+(?=\\[^\\]+\\))*/)[0]);
	for(let cpu of OS.cpus())
		Cluster.fork();
}else{
	const FS=require('fs');
	const Zlib=require('zlib');
	const Http=require('http');
	const Https=require('https');
	const ChildProcess=require('child_process');
	const Mimes={
		'.':'application/octet-stream',
		'.txt':'text/plain',
		'.html':'text/html',
		'.js':'text/javascript',
		'.css':'text/css',
		'.svg':'image/svg+xml',
		'.bmp':'image/bmp',
		'.webp':'image/webp',
		'.png':'image/png',
		'.jpeg':'image/jpeg',
		'.gif':'image/gif',
		'.cur':'image/cursor',
		'.ico':'image/icon',
		'.mid':'audio/midi',
		'.mp3':'audio/mp3',
		'.aac':'audio/aac',
		'.mp4':'video/mp4',
	};

	const argv=process.argv;
	const maxSize=12*1024*1024;
	const highWaterMark=5*1024*1024;
	const dir=argv[1].match(/^[^\\]+(\\[^\\]+(?=\\[^\\]+\\))*/)[0];
	const page404=dir+'/404.html';
	const zlibOption={windowBits:15, memLevel:9, level:9};

	Http.createServer(function(request, response){
		let headers=request.headers;
		if('origin' in headers)
			response.setHeader('Access-Control-Allow-Origin', '*');
		if(request.method==='OPTIONS'){
			response.writeHead(204);
			response.end();
			return;
		}

		let extension, isDir;
		let url=decodeURI(request.url);
		let _path=url.match(/^[^\?]*/)[0];
		if(_path.endsWith('/')){
			isDir=true;
			_path+='index.html';
			extension='.html';
		}else{
			isDir=false;
			extension=url.match(/(\.[^.]*)?$/)[0]||'.html';
		}
		let path=dir+_path;

		if(FS.existsSync(path)){
			let stats=FS.statSync(path);
			let etag=stats.mtime.getTime().toString(36);
			if(stats.isFile()){
				if('range' in headers&&(headers['if-match']===etag||'if-match' in headers===false&&'if-unmodified-since' in headers===false)){
					let start, end;
					let matches=headers['range'].match(/^bytes=(\d*)-(\d*)$/);
					if(matches[1])
						start=matches[1]-0, end=(matches[2]-0+1||stats.size)-1;
					else
						start=stats.size-matches[2], end=stats.size-1;

					if('if-unmodified-since' in headers)
						response.setHeader('Last-Modified', stats.mtime.toGMTString());
					response.writeHead(206, {
						'ETag':etag,
						'Content-Range':`bytes ${start}-${end}/${stats.size}`,
						'Content-Length':end-start+1,
					});
					FS.createReadStream(path, {start, end, highWaterMark}).pipe(response);
				}else if(headers['if-none-match']===etag){
					response.writeHead(304);
					response.end();
				}else{
					extension=Mimes[extension]||'application/'+extension.slice(1);
					response.setHeader('ETag', etag);
					response.setHeader('Content-Type', extension);
					response.setHeader('Cache-Control', 'max-age=0');
					if(extension==='.html')
						response.setHeader('Last-Modified', stats.mtime.toGMTString());

					if(stats.size<maxSize){
						FS.readFile(path, function(error, buffer){
							if(error)
								throw error;
							if(headers['accept-encoding']&&headers['accept-encoding'].split(/\s*,\s*/g).indexOf('deflate')>=0){
								let zip=Zlib.deflateSync(buffer, zlibOption);
								if(zip.length+27<stats.size){
									response.writeHead(200, {'Content-Encoding':'deflate'});
									response.end(zip);
									return;
								}
							}
							response.writeHead(200);
							response.end(buffer);
						});
					}else{
						response.writeHead(200, {'Content-Length':stats.size});
						FS.createReadStream(path, {highWaterMark}).pipe(response);
					}
				}
				let date=new Date();
				console.log(`${_path}·${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} ${date.getMonth()+1}/${date.getDate()}`);
				return;
			}
		}else if(isDir){
			response.writeHead(404, {'Content-Type':'text/html'});
			response.end(`<html><script>location.replace(encodeURI(unescape('index.html${escape(url.match(/(\?(.|\n)*)?$/)[0])}')))</script></html>`);
			return;
		}
		if(FS.existsSync(page404)){
			let stats=FS.statSync(page404);
			if(stats.size<maxSize){
				FS.readFile(page404, function(error, buffer){
					if(error)
						throw error;
					let zip=Zlib.deflateSync(buffer, zlibOption);
					if(zip.length+27<stats.size){
						response.writeHead(404, {'Content-Encoding':'deflate', 'Content-Type':'text/html'});
						response.end(zip);
					}else{
						response.writeHead(404, {'Content-Type':'text/html'});
						response.end(buffer);
					}
				});
			}else{
				response.writeHead(404, {'Content-Length':stats.size, 'Content-Type':'text/html'});
				FS.createReadStream(page404, {highWaterMark}).pipe(response);
			}
			let date=new Date();
			console.log(`/404.html·${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} ${date.getMonth()+1}/${date.getDate()}`);

		}else{
			response.writeHead(404, {'Content-Type':'application/octet-stream'});
			response.end();
		}
	}).listen(argv[2]?argv[2]-0:8080);

	process.on('uncaughtException', function(error){
		console.error(error.toString());
	});
}