var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var crypto = require('crypto');
var mongoose = require('mongoose');
var multer = require('multer');
var GridFsStorage = require('multer-gridfs-storage');
var Grid = require('gridfs-stream');
var methodOverride = require('method-override');





var app = express();

//Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');


//mongoDb connection
//var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost:27017/MongoImage', { useNewUrlParser: true });

var mongoURI = 'mongodb://localhost:27017/MongoImage';
var conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;
// init uploads
conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
    // all set!
})

//create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });

//@route GET
//@desc loads form


app.get('/', (req, res) => {
    // res.render('index');
    gfs.files.find().toArray((err, files) => {
        // check if files
        if (!files || files.length === 0) {
            res.render('index', { files: false });
        } else {
            files.map(file => {
                if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                    file.isImage = true;
                }
                else {
                    file.isImage = false;
                }
            });
            res.render('index', { files: files });
        }
    });
});


//@route POST  /uploads
// @desc Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
    // res.json({file: req.file });
    res.redirect('/');
});

// @route Get/files
// @desc Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // check if files
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            })
        }
        //files exist
        return res.json(files);
    });
});

// @route Get/files/:filename
// @desc Display one particular file from using filename JSON
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        //check if file present
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exist'
            });
        }
        // file exists
        return res.json(file);
    });
});


// @route Get images
// @desc Display one image  in JSON
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        //check if file present
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exist'
            });
        }

        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        }
        else {
            res.status(404).json({
                err: 'Not an image'
            });
        }
    });
});


// @route DELETE /files/:id
//@desc Delete file
app.delete('/files/:id' , (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
        if (err) {
            return res.status(404).json({ err: err });
        }
        res.redirect('/');
    });
});




var port = 5000;

app.listen(port);


