const song = document.createElement("audio");
song.src = "/code/take-me-to-your-heart.mp3";
document.body.append(song);
song.play();
return () => {
	song.pause();
	document.body.removeChild(song);
};
