import http from "http";
import { randomUUID } from "crypto";
import { Database } from "./database.js";
import { parse } from 'csv-parse';

const port = 3000;
const database = new Database();

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.url === "/" && req.method === "GET") {
    res.statusCode = 200;
    const message = { message: "WORKING API REST!" };
    res.end(JSON.stringify(message));
  } else if (req.url === "/tasks" && req.method === "GET") {
    res.statusCode = 200;
    const tasks = database.select("tasks");
    res.end(JSON.stringify(tasks));
  } else if (req.url === "/tasks" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      const newTask = JSON.parse(body);

      if (!newTask.title || !newTask.description) {
        res.statusCode = 400;
        const response = {
          message: "Task title and description are required.",
        };
        return res.end(JSON.stringify(response));
      }

      const dataTask = {
        id: randomUUID(),
        title: newTask.title,
        description: newTask.description,
        completed_at: null,
        created_at: new Date().getTime(),
        updated_at: null,
      };

      const task = database.insert("tasks", dataTask);
      res.statusCode = 201;
      const response = {
        message: "new task successfully created!",
        data: task,
      };
      res.end(JSON.stringify(response));
    });
  } else if (req.url === '/tasks/import' && req.method === 'POST') {
    //* importar csv com a lib csv-parse
    // ? Utilize o Curl
    // ? curl -X POST -H "Content-Type: text/csv" --data-binary @arq.csv http://localhost:3000/tasks/import
  
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      const tasks = await parseCSV(body);
      const database = new Database();

      for (const task of tasks) {
        console.log(task)
        const id = randomUUID();
        const title = task.title;
        const description = task.description;
        const completed_at = null;
        const created_at = new Date().getTime();
        const updated_at = null;

        const newTask = {
          id,
          title,
          description,
          completed_at,
          created_at,
          updated_at,
        };

        database.insert('tasks', newTask);
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Tasks imported successfully');
    });
  } else if (req.url.startsWith("/tasks/") && req.method === "PUT") {

    const taskId = req.url.split("/")[2];
    console.log("taskId: ", taskId);
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      const { title, description } = JSON.parse(body);

      if (title || description) {
        res.statusCode = 400;
        const response = {
          message: "Task title and description are required.",
        };
        return res.end(JSON.stringify(response));
      }

      const findTask = database.findById("tasks", taskId);

      if (findTask) {

        findTask.title = title
        findTask.description = description
        findTask.updated_at = new Date().getTime();

        const updatedTask = database.update("tasks", taskId, findTask);
        if (updatedTask) {
          res.statusCode = 200;
          const response = {
            message: `Task ${taskId} updated successfully!`,
            task: updatedTask,
          };
          res.end(JSON.stringify(response));
        } else {
          res.statusCode = 500;
          const response = {
            message: "An error occurred while updating the task.",
          };
          res.end(JSON.stringify(response));
        }
      } else {
        res.statusCode = 404;
        const response = { message: "Task not found." };
        res.end(JSON.stringify(response));
      }
    });

  } else if (
    req.url.startsWith("/tasks/") &&
    req.url.endsWith("/complete") &&
    req.method === "PATCH"
  ) {
    const taskId = req.url.split("/")[2];

    const findTask = database.findById("tasks", taskId);

    if (findTask) {
      findTask.completed_at = new Date().getTime();
      const updatedTask = database.update("tasks", taskId, findTask);
      if (updatedTask) {
        res.statusCode = 200;
        const response = {
          message: `Task ${taskId} updated successfully!`,
          task: updatedTask,
        };
        res.end(JSON.stringify(response));
      } else {
        res.statusCode = 500;
        const response = {
          message: "An error occurred while updating the task.",
        };
        res.end(JSON.stringify(response));
      }
    } else {
      res.statusCode = 404;
      const response = { message: "Task not found." };
      res.end(JSON.stringify(response));
    }
  } else if (req.url.startsWith("/tasks/") && req.method === "DELETE") {
    const taskId = req.url.split("/")[2];

    const deleteTask = database.delete("tasks", taskId);
    res.statusCode = 200;
    const response = {
      message: `Task ${taskId} successfully deleted!`,
      deleteTask: deleteTask,
    };
    res.end(JSON.stringify(response));
  } else {
    res.statusCode = 404;
    const response = { message: "route not found!" };
    res.end(JSON.stringify(response));
  }
});


async function parseCSV(csvData) {
  return new Promise((resolve, reject) => {
    parse(csvData, { columns: true }, (err, records) => {
      if (err) {
        reject(err);
      } else {
        resolve(records);
      }
    });
  });
}

server
  .listen(port, () => {
    console.log(`Server listening on port ${port}`);
  })
  .on("error", handleServerStartError);

function handleServerStartError(error) {
  console.error("An error occurred while starting the server:", error);
  process.exit(1);
}
