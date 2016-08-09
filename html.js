const new_span = node => {
	const span = document.createElement("span");
	span.append(node);
	return span;
};

const link1 = recycle(nodes => {
	const link = document.createElement("link");
	link.append(nodes);
	link.addEventListener("click", () => void link.blur());
	link.addEventListener("mouseleave", () => void link.blur());
	link.addEventListener("mousemove", () => void link.focus());
	return link;
});
const link = (uri, nodes, ref) => link1(nodes, link => {
	link.href = uri;
	ref(link);
});

const new_plain = source => {
	const match = source.match(/[^\0-\u{ff}]+/u);
	return match
	? ((
		{index} = match,
		[$] = match
	) => [
		source.slice(0, index),
		new_span($),
		...new_plain(source.slice(index + $.length)),
	])()
	: [source];
};
const plain = recycle(new_plain);

const media = (uri, ref) => {
	const first_ref = true;
	const thunk1 = plain((() => {
		try{
			const t = decodeURI(uri);
			return /\n|\r|\t/u.test(t) ? uri : t;
		}catch(error){
			return uri;
		}
	})(), plain => {
		
	});
	const image = document.createElement("img");
	const video = document.createElement("video");
	const image_off = () => void (
		image.removeEventListener("abort", image_onabort);
		image.removeEventListener("load", image_onload);
		image.removeEventListener("error", image_onerror)
	);
	const image_onabort = () => void (
		image.src = "";
		image.src = uri
	);
	const image_onload = () => void (
		image_off();
		link.hidden = true;
		image.hidden = false
	);
	const image_onerror = () => void (
		image_off();
		image.src = "";
		video.addEventListener("abort", video_onabort);
		video.addEventListener("canplay", video_oncanplay);
		video.addEventListener("error", video_onerror);
		video.src = uri
	);
	const video_off = () => void (
		video.removeEventListener("abort", video_onabort);
		video.removeEventListener("canplay", video_oncanplay);
		video.removeEventListener("error", video_onerror)
	);
	const video_onabort = () => void (
		video.src = "";
		video.src = uri
	);
	const video_oncanplay = () => void (
		video_off();
		link.hidden = true;
		video.hidden = false;
		video.videoWidth || video.videoHeight || video.setAttribute("mini", "")
	);
	const video_onerror = () => void (
		video_off();
		video.src = "";
		requestAnimationFrame(() => setTimeout(start, 2000))
	);
	const start = () => void (
		image.addEventListener("abort", image_onabort);
		image.addEventListener("load", image_onload);
		image.addEventListener("error", image_onerror);
		image.src = uri
	)
) => (
	image.hidden = video.hidden = video.controls = true,
	start(),
	[link, image, video]
),

return {link, plain};
