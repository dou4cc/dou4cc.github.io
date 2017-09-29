'use strict';
var Cluster=require('cluster');

if(Cluster.isMaster){
	var OS=require('os');

	process.title=process.argv.slice(1).join(' ');
	process.chdir(process.argv[1].match(/^[^\\]+(\\[^\\]+(?=\\[^\\]+\\))*/)[0]);
	for(var cpu of OS.cpus())
		Cluster.fork();
}else{
	var FS=require('fs');
	var Zlib=require('zlib');
	var Http=require('http');
	var Https=require('https');
	var ChildProcess=require('child_process');
	var Mimes={
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

	var argv=process.argv;
	var maxSize=12*1024*1024;
	var highWaterMark=5*1024*1024;
	var dir=argv[1].match(/^[^\\]+(\\[^\\]+(?=\\[^\\]+\\))*/)[0];
	var page404=dir+'/404.html';
	var zlibOption={windowBits:15, memLevel:9, level:9};

	Http.createServer(function(request, response){
		var headers=request.headers;
		if('origin' in headers)
			response.setHeader('Access-Control-Allow-Origin', '*');
		if(request.method==='OPTIONS'){
			response.writeHead(204);
			response.end();
			return;
		}

		var extension, isDir;
		var url=decodeURI(request.url);
		var _path=url.match(/^[^\?]*/)[0];
		if(/\/$/.test(_path)){
			isDir=true;
			_path+='index.html';
			extension='.html';
		}else{
			isDir=false;
			extension=url.match(/(\.[^.]*)?$/)[0]||'.html';
		}
		var path=dir+_path;

		if(FS.existsSync(path)){
			var stats=FS.statSync(path);
			var etag=stats.ctime.getTime().toString(36)+'.'+stats.size.toString(36);
			if(stats.isFile()){
				if(headers['if-none-match']===etag){
					response.writeHead(304);
					response.end();
				}else if('range' in headers&&(headers['if-match']===etag||'if-match' in headers===false&&'if-unmodified-since' in headers===false)){
					var start, end;
					var matches=headers['range'].match(/^bytes=(\d+)-(\d+)?$/);
					if(matches[1])
						start=matches[1]-0, end=(matches[2]-0+1||stats.size)-1;
					else
						start=stats.size-matches[2], end=stats.size-1;

					if('if-unmodified-since' in headers)
						response.setHeader('Last-Modified', stats.mtime.toGMTString());
					response.writeHead(206, {
						'ETag':etag,
						'Content-Range':'bytes '+start+'-'+end+'/'+stats.size,
						'Content-Length':end-start+1,
					});
					FS.createReadStream(path, {start: start, end: end, highWaterMark: highWaterMark}).pipe(response);
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
								var zip=Zlib.deflateSync(buffer, zlibOption);
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
						FS.createReadStream(path, {highWaterMark: hignWaterMark}).pipe(response);
					}
				}
				var date=new Date();
				console.log(_path+'·'+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()+' '+(date.getMonth()+1)+'/'+date.getDate());
				return;
			}
		}else if(isDir){
			response.writeHead(404, {'Content-Type':'text/html'});
			response.end("<html><script>location.replace(encodeURI(unescape('index.html"+escape(url.match(/(\?(.|\n)*)?$/)[0])+"')))</script></html>");
			return;
		}
		if(FS.existsSync(page404)){
			var stats=FS.statSync(page404);
			if(stats.size<maxSize){
				FS.readFile(page404, function(error, buffer){
					if(error)
						throw error;
					if(headers['accept-encoding']&&headers['accept-encoding'].split(/\s*,\s*/g).indexOf('deflate')>=0){
						var zip=Zlib.deflateSync(buffer, zlibOption);
						if(zip.length+27<stats.size){
							response.writeHead(404, {'Content-Encoding':'deflate', 'Content-Type':'text/html'});
							response.end(zip);
							return;
						}
					}
					response.writeHead(404, {'Content-Type':'text/html'});
					response.end(buffer);
				});
			}else{
				response.writeHead(404, {'Content-Length':stats.size, 'Content-Type':'text/html'});
				FS.createReadStream(page404, {highWaterMark: highWaterMark}).pipe(response);
			}
			var date=new Date();
			console.log('/404.html·'+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()+' '+(date.getMonth()+1)+'/'+date.getDate());

		}else{
			response.writeHead(404, {'Content-Type':'application/octet-stream'});
			response.end();
		}
	}).listen(argv[2]?argv[2]-0:8080);

	process.on('uncaughtException', function(error){
		try{
			console.error(error instanceof Error ? error.stack : error.toString());
		}catch(error){
			console.error("Unknown Error");
		}
	});
}
