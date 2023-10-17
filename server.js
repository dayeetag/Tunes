const express = require("express");
const app = express();

const exphbs = require('express-handlebars');
app.engine('.hbs', exphbs.engine({ extname: '.hbs' }));
app.set('view engine', '.hbs');

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.static("assets"))
app.use(express.urlencoded({ extended: true }))

const path = require("path")

const mongoose = require("mongoose");

// Constants
const dbName = "tunes"
const password = "gb9IGEWa5Mbgk0Qs"
const CONNECTION_STRING = `mongodb+srv://dbUser:${password}@cluster0.9qiml10.mongodb.net/${dbName}?retryWrites=true&w=majority`;

mongoose.connect(CONNECTION_STRING);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Error connecting to database: "));
db.once("open", () => {
    console.log("Mongo DB connected successfully.");
});

const Schema = mongoose.Schema;
const songSchema = new Schema({
    track_id: String,
    title: String,
    artist: String,
    picture: String
});
const playlistSchema = new Schema({
    playlist_id: String,
    playlist_name: String,
    tracks: [{unique_id: String, track_id: String}]
});

const song = mongoose.model("song", songSchema);
const playlist = mongoose.model("playlist", playlistSchema);

const generatePlaylistID = async () => {
    try {
        const result = await playlist.findOne().sort({"playlist_id": -1}).lean().exec()
        const currentMaxID = result !== null? result.playlist_id : 0

        const playlistID = parseInt(currentMaxID) + 1
        return playlistID
    }
    catch(err){
        console.log(`Error when generating playlist ID: ${err}`)
    }
}

app.get("/", async (req, res) => {
    try {
        const result = await song.find().lean().exec()
        const result2=await playlist.find().lean().exec()
        res.render("home",
            {
                layout: "layout",
                music: result,
                playlist: result2
            });
    }
    catch (err) {
        console.log(err)
        return res.send(err);
    }
});

app.get("/playlist", async(req, res) => {
    const createPlaylist = req.query.createPlaylist === "false"? false : true
    try {
        const result = await playlist.find().lean().exec()
        res.render("playlist",
        {
            layout: "layout",
            playlist: result,
            createPlaylist: createPlaylist
        });
    }
    catch (err) {
        console.log(err)
        return res.send(err);
    }
});

app.post("/create-playlist", async(req, res)=>{
    const playlistID = await generatePlaylistID()
    const playlistName=req.body.playlist_name;
    const tracks=[]
    const newPlaylist = {
        playlist_id: playlistID,
        playlist_name: playlistName,
        tracks: tracks
    }
    try {
        const playlistToSave = new playlist(newPlaylist)
        await playlistToSave.save()
        res.redirect("/playlist?createPlaylist=false")
    }
    catch (err) {
        console.log(err)
        return res.send(err);
    }
})

app.post("/delete-playlist/:id", async(req, res)=>{
    const playlistID = req.params.id
    try {
        const result = await playlist.findOne({playlist_id: playlistID})
        const deletePlaylist = await result.deleteOne()
        res.redirect("/playlist?createPlaylist=false")
    }
    catch (err) {
        console.log(err)
        return res.send(err);
    }
})

app.get("/playlistDescription/:id", async(req, res)=>{
    try {
        const result1 = await playlist.findOne({playlist_id: req.params.id}).lean().exec()
        const songs=[]
        if(result1.tracks.length!==0){
            for(track of result1.tracks)
            {
                const result2 = await song.findOne({track_id: track.track_id}).lean().exec()
                result2.unique_id=track.unique_id;
                result2.playlist_id=result1.playlist_id
                songs.push(result2)
            }
        }
        res.render("playlistDescription",
        {
            layout: "layout",
            playlistName: result1.playlist_name,
            tracks: songs
        });
    }
    catch (err) {
        console.log(err)
        return res.send(err);
    }
})

app.post("/delete-song/:playlistID/:uniqueID", async(req, res) => {
    const playlistID = req.params.playlistID;
    const uniqueID = req.params.uniqueID;
    try {
        const result = await playlist.findOne({playlist_id: playlistID})
        const update = await result.updateOne({$pull: {tracks: {unique_id: uniqueID}}})
        res.redirect(`/playlistDescription/${playlistID}`)
    }
    catch (err) {
        console.log(err)
        return res.send(err);
    }
})

app.post("/add-song/:trackid", async(req, res) => {
    const trackID = req.params.trackid;
    const playlistID = req.body.playlist;
    try {
        const result = await playlist.findOne({playlist_id: playlistID})
        const update = await result.updateOne({$push: {"tracks": {unique_id:Date.now(), track_id: trackID}}})
        res.redirect("/")
    }
    catch (err) {
        console.log(err)
        return res.send(err);
    }
})


app.get("/playlistDescription/css/styles.css", (req, res)=>{
    res.sendFile(path.join(__dirname, "assets/css/styles.css"));
})

const onHttpStart = () => {
    console.log(`The web server has started at http://localhost:${HTTP_PORT}/`);
    console.log("Press CTRL+C to stop the server.");
};

app.listen(HTTP_PORT, onHttpStart);