import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/assets/'); // Uploads will be stored in the 'uploads/' directory
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const db = new pg.Client({
    user : process.env.PGUSER,
    host : process.env.PGHOST,
    database : process.env.PGDATABASE,
    password : process.env.PGPASSWORD,
    port : process.env.PGPORT
  });
  
db.connect();
 
app.get("/", async (req, res) => {
    const result = await db.query('SELECT * FROM book_shelf');
    res.render("index.ejs", {books : result.rows});
})  

app.get("/:id", async (req, res) => {
    const id = req.params.id;
    const result = await db.query('SELECT * FROM book_shelf WHERE id = ($1)', [id]);
    res.render("book.ejs", {book : result.rows[0]})
}); 

app.post("/edit", async (req, res) => {
    const id = req.body.bookId;
    const result = await db.query('SELECT * FROM book_shelf WHERE id = ($1)', [id]);
    res.render("edit.ejs", {book : result.rows[0]});
});

const upload = multer({ storage });

app.post("/upload", upload.single('upload'), async (req, res) => {
    let imagePath = null;
    try {
        imagePath = req.file.filename;
    } catch {
        imagePath = null; 
    }
    const id = req.body.bookId;
    const title = req.body.title;
    const short_intro = req.body.shortDescription
    const description = req.body.description; 
    const rating = req.body.rating;

    const result = await db.query('SELECT * FROM book_shelf WHERE id = ($1)', [id]);
    const row = result.rows[0];
    try {
        const updateQuery = `
        UPDATE book_shelf 
        SET 
            title = $1,
            short_intro = $2,
            description = $3,
            rating = $7,
            image_path = $4,
            date_ = $5
        WHERE id = $6
    `;

    const values = [
        title || row.title,
        short_intro || row.short_intro,
        description || row.description,
        imagePath ? `/assets/${imagePath}` : row.image_path,
        new Date(),
        id,
        rating || row.rating
    ];

    await db.query(updateQuery, values);
    res.redirect('/');
    } catch (error) {
    res.send('error');
        
    }
});

app.post('/delete', async (req,res)=> {
    const id = req.body.bookId;
    await db.query(`DELETE FROM book_shelf WHERE id = '${id}'`);
    res.redirect('/');
});

app.post('/sort', async (req,res)=> {
    const sort = req.body.sort;
    let result = [];
    if (sort === 'title') {
        result = await db.query(`SELECT * FROM book_shelf ORDER BY title`);
        
    } else if (sort === 'newest'){
        result = await db.query(`SELECT * FROM book_shelf ORDER BY date_ DESC`);
        
    } else if (sort === 'best'){
        result = await db.query(`SELECT * FROM book_shelf ORDER BY rating DESC`);
        
    }

    res.render('index.ejs', {books : result.rows}); 
});
 
app.post('/add',upload.single('add'), async (req, res)=> {
    res.render('add.ejs');
})

app.post('/addBook', upload.single('upload'), async (req, res)=> {
    const title = req.body.title;
    const shortDescription = req.body.shortDescription;
    const description = req.body.description;
    const rating = req.body.rating;
    const imagePath = req.file.filename;

    console.log(imagePath);
    const insertQuery = `
    INSERT INTO book_shelf (title,short_intro, description, rating , image_path,date_)
    VALUES ($1,$2,$3,$4,$5,$6)
    `;

    const values = [
        title ,
        shortDescription ,
        description ,
        rating,
        `/assets/${imagePath}`,
        new Date(),
    ];
    await db.query(insertQuery, values);
    res.redirect('/');
})
app.listen(port, (req, res) => {
    console.log('listening on port ', port);
})
