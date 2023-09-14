const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ExcelJS = require('exceljs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

// Enable JSON request body parsing
app.use(bodyParser.json());

// Enable CORS
app.use(cors());
const mysql = require('mysql');

// Create a MySQL connection
const db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'qyzmet',
  // port:3311
});

// Connect to the database
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to MySQL database');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = `SELECT * FROM users WHERE email = ? `;
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: err });
    }
    if (result.length === 0) {
      return res.status(401).send({ message: 'Invalid email or password' });
    }
    const user = result[0];
    if (user.password !== password) {
      return res.status(401).send({ message: 'Invalid email or password' });
    }
    const payload = {email: user.email, name: user.fullname};

    const token = jwt.sign(payload, 'qyz', { expiresIn: '1h' });

    res.json({ success: true, message: "Login successful",token:token });
  });
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  const sel = `SELECT * FROM users WHERE email = ? `;
  db.query(sel, [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: err });
    }
    if (result.length > 0) {
      return res.status(401).send({ message: 'Email already exists' });
    }
    const sql = `INSERT INTO users (email, password) VALUES (?, ?)`;
    db.query(sql, [email, password], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: err });
      }
       const payload = {email: email};

      const token = jwt.sign(payload, 'qyz', { expiresIn: '1h' });

       return res.status(200).send({ token });
    });
  });
});
    




// Use user routes
app.get('/categories', (req, res) => {
    const sql = `SELECT c.id AS category_id,c.image as image, c.name AS category_name, s.id AS subcategory_id, s.name AS subcategory_name
                 FROM category c
                 JOIN subcategory s ON c.id = s.category_id`;
  
       db.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: err });
      }
  
      // Group subcategories by category
      const categories = result.reduce((acc, curr) => {
        const { category_id, category_name,image, subcategory_id, subcategory_name } = curr;
        if (!acc[category_id]) {
          acc[category_id] = { id: category_id, name: category_name,image:image, subcategories: [] };
        }
        acc[category_id].subcategories.push({ id: subcategory_id, name: subcategory_name,image:image });
        return acc;
      }, {});
  
      // Convert object to array and send response
      const data = Object.values(categories);
      return res.status(200).send(data);
    });
  });



  app.get('/categories/:categoryId', (req, res) => {
    const id = req.params.categoryId;
    const sql = `SELECT c.id AS category_id,s.description as subcategory_desc, c.name AS category_name, s.id AS subcategory_id, s.name AS subcategory_name
    FROM category c
    JOIN subcategory s ON c.id = s.category_id where s.category_id = ${id}`;
  
       db.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: err });
      }
  
      // Group subcategories by category
      const categories = result.reduce((acc, curr) => {
        const { category_id, category_name, subcategory_id, subcategory_name,subcategory_desc } = curr;
        if (!acc[category_id]) {
          acc[category_id] = { id: category_id, name: category_name, subcategories: [] };
        }
        acc[category_id].subcategories.push({ id: subcategory_id, name: subcategory_name,desc:subcategory_desc });
        return acc;
      }, {});
  
      // Convert object to array and send response
      const data = Object.values(categories);
      return res.status(200).send(data);
    });
  });


  app.get('/categories/:category_id/:subcategory_id', (req, res) => {
    const id = req.params.subcategory_id;
    const sql = `SELECT * from subcategory where id = ${id}`;
  
       db.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: err });
      }
  
      // Group subcategories by category
      
      return res.status(200).send(result);
    });
  });

  app.get('/questions/:subcategory_id', (req, res) => {
    const id = req.params.subcategory_id;
    const sql = `SELECT * from request_questions where subcategory_id = ${id}`;
  
       db.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: err });
      }
      let data = [];

       result.forEach(element => {
        if(element.answers){
        data.push( {
          id:element.id,
          questions:element.questions,
          subcategory_id:element.subcategory_id,
          answers:element.answers.split(','),
        })
      }else{
        data.push( {
          id:element.id,
          questions:element.questions,
          subcategory_id:element.subcategory_id,
          answers:null,
        })
        
       }});
  
      
      return res.status(200).send(data);
    });
  });


  app.post('/create',  (req, res) => {
    const {lat, lng, location_name, name,surname,email,num
      ,status, subcategory_id,description,answers } = req.body;
  
      const now = new Date();
      const sql = `INSERT INTO requests (lat, lng, location_name, name,surname,email,phonenumber
      ,status, subcategory_id,description,answers,created_at) VALUES (?, ?, ?,?,?,?, ?, ?,?,?,?,?)`;
    db.query(sql, [lat, lng, location_name, name,surname,email,num
      ,status, subcategory_id,description,answers,now], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: err });
      }
  
      // const post = { id: result.insertId, title, content, image };
      return res.status(201).send("Request created successfully");
    });
  });

  app.get('/requests', (req, res) => {
    const sql = `SELECT * from requests`;
    db.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: err });
      }
      let scale=0;
      let missed = 0;
      let done = 0;
      let todo= 0;

      result.forEach(element => {
        if(element.status == "todo"){
          todo++;
        }
        else if(element.status == "done"){
          done++;
        }
        else if(element.status == "missed"){
          missed++;
        }

      });
      scale = ((todo/2+missed)/(todo+missed+done))*100;
      scale = Math.round(scale);
      
      return res.status(200).send(
        {data:result,
        scale:scale,
        });
    });
  });



  app.get('/indicators', (req, res) => {
    const sql = `SELECT category.id, category.image , category.name, COUNT(requests.id) AS num_requests
    FROM category
    LEFT JOIN subcategory ON category.id = subcategory.category_id
    LEFT JOIN requests ON subcategory.id = requests.subcategory_id
    GROUP BY category.id;`;
    db.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: err });
      }
      let count = 0;
      result.map((item) => {
        count += item.num_requests;
        return item;
      });

      return res.status(200).send({
        total: count,
        data: result,
      });
    });
  });
  

  // app.get('/indicators/:id', (req, res) => {
  //   const sql = `SELECT subcategory.id, subcategory.name, COUNT(requests.id) AS num_requests
  //   FROM subcategory
  //   LEFT JOIN requests ON subcategory.id = requests.subcategory_id
  //   WHERE subcategory.category_id = ${req.params.id}
  //   GROUP BY subcategory.id;`;
  //   db.query(sql, (err, result) => {
  //     if (err) {
  //       console.error(err);
  //       return res.status(500).send({ message: err });
  //     }
  //     let count = 0;
  //     result.map((item) => {
  //       count += item.num_requests;
  //       return item;
  //     });
  //     return res.status(200).send({
  //       total: count,
  //       data: result,
  //     });
  //   });
  // });
  app.get('/indicators/:id', (req, res) => {
    const sql = `
      SELECT subcategory.id, subcategory.name, 
        requests.id AS request_id, requests.location_name as location, 
        requests.status as stat, requests.description as description, 
        requests.email as email, requests.phonenumber as phone
      FROM subcategory
      LEFT JOIN requests ON subcategory.id = requests.subcategory_id
      WHERE subcategory.category_id = ${req.params.id}
    `;
  
    db.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: err });
      }
  
      const subcategories = {};
      result.forEach((row) => {
        const { id, name, request_id, ...request } = row;
  
        if (!subcategories[id]) {
          subcategories[id] = { id, name, requests: [] };
        }
  
        if (request_id) {
          subcategories[id].requests.push(request);
        }
      });
  
      const data = Object.values(subcategories);
      const total = data.reduce((acc, { requests }) => acc + requests.length, 0);
  
      return res.status(200).send({
        total,
        data,
      });
    });
  });
  

  app.get('/download-excel/:id', async (req, res) => {
  try {
    // Fetch data from the database and format it as an array of objects
    const sql = `SELECT r.*
    FROM requests r
    JOIN subcategory s ON r.subcategory_id = s.id
    JOIN category c ON s.category_id = c.id
    WHERE c.id = ${req.params.id};`;
  
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Define the columns and add the data to the worksheet
    worksheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Latitude', key: 'lat' },
      { header: 'Longitude', key: 'lng' },
      { header: 'Location Name', key: 'location_name' },
      { header: 'Name', key: 'name' },
      { header: 'Surname', key: 'surname' },
      { header: 'Email', key: 'email' },
      { header: 'Phone Number', key: 'phonenumber' },
      { header: 'Status', key: 'status' },
      { header: 'Subcategory ID', key: 'subcategory_id' },
      { header: 'Description', key: 'description' },
      { header: 'Answers', key: 'answers' },
      { header: 'Created At', key: 'created_at' }
    ];

    const data = await new Promise((resolve, reject) => {
      db.query(sql, (err, result) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    worksheet.addRows(data);
    

    // Save the workbook to a buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set the response headers for downloading the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data.xlsx');

    // Send the buffer as the response body
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while generating the Excel file');
  }
});

app.get('/all-categories', (req, res) => {
  const sql = `SELECT * from category`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: err });
    }
    return res.status(200).send(result);
  });
});


app.get('/subcategories/:id', (req, res) => {
  const sql = `SELECT * from subcategory where category_id = ${req.params.id}`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: err });
    }
    return res.status(200).send(result);
  });
});

app.get('/requests/:id', (req, res) => {
  const sql = `SELECT * from requests where subcategory_id = ${req.params.id}`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: err });
    }
    return res.status(200).send(result);
  });
});

app.get('/indicators/:id/:filter', (req, res) => {
  const filter = req.params.filter;
  let sql = null;
  if (filter === 'day') {
    sql = `SELECT subcategory.id, subcategory.name, COUNT(requests.id) AS num_requests
    FROM subcategory
    LEFT JOIN requests ON subcategory.id = requests.subcategory_id
    WHERE subcategory.category_id = ${req.params.id} and DATE(created_at) = CURDATE()
    GROUP BY subcategory.id;`;
  }
  else if (filter === 'week') {
    sql = `SELECT subcategory.id, subcategory.name, COUNT(requests.id) AS num_requests
    FROM subcategory
    LEFT JOIN requests ON subcategory.id = requests.subcategory_id
    WHERE subcategory.category_id = ${req.params.id} and WEEK(created_at) = WEEK(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
    GROUP BY subcategory.id;`;
  }
  else if (filter === 'month') {
    sql = `SELECT subcategory.id, subcategory.name, COUNT(requests.id) AS num_requests
    FROM subcategory
    LEFT JOIN requests ON subcategory.id = requests.subcategory_id
    WHERE subcategory.category_id = ${req.params.id} and MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
    GROUP BY subcategory.id;`;
  }

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: err });
    }
    let count = 0;
    result.map((item) => {
      count += item.num_requests;
      return item;
    });
    return res.status(200).send({
      total: count,
      data: result,
    });
  });
});


app.get('/ind/:filter', (req, res) => {
  const filter = req.params.filter;
  let sql = null;
  if (filter === 'day') {
   sql = `SELECT category.id, category.name,category.image, COUNT(requests.id) AS num_requests
   FROM category
   LEFT JOIN subcategory ON category.id = subcategory.category_id
   LEFT JOIN requests ON subcategory.id = requests.subcategory_id
   WHERE created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY
   GROUP BY category.id, category.name;`;
  }
  else if (filter === 'week') {
    sql = `SELECT category.id, category.name,category.image, COUNT(requests.id) AS num_requests
  FROM category
  LEFT JOIN subcategory ON category.id = subcategory.category_id
  LEFT JOIN requests ON subcategory.id = requests.subcategory_id
  where  WEEK(created_at) = WEEK(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
  GROUP BY category.id;`;
}
  else if (filter === 'month') {
    sql = `SELECT category.id, category.name,category.image, COUNT(requests.id) AS num_requests
  FROM category
  LEFT JOIN subcategory ON category.id = subcategory.category_id
  LEFT JOIN requests ON subcategory.id = requests.subcategory_id
  where MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
  GROUP BY category.id;`;
  }
     db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: err });
    }
    let count = 0;
    result.map((item) => {
      count += item.num_requests;
      return item;
    });

    return res.status(200).send({
      total: count,
      data: result,
    });
  });
});




app.use('/images', express.static(path.join(__dirname, 'images')));
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
