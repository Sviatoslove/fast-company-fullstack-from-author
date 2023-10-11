const express = require('express');
const mongoose = require('mongoose');
const config = require('config');
const chalk = require('chalk');
const path = require('path')
const cors = require('cors')
const initDatabase = require('./startUp/initDatabase');
const routes = require('./routes');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors())
app.use('/api', routes);

const PORT = config.get('port') ?? 8080;

if (process.env.NODE_ENV === 'production') {
  console.log(chalk.blueBright('Production'));
  // если мы запускаем сервак в продакшщн моде то тогда по адресу '/' мы должны отдавать статическую папочку build
   app.use('/', express.static(path.join(__dirname, 'client')))// если мы запрашиваем корневой url => '/' то тогда мы добавляем middleware express.static в который передаём правильный путь до статической папки

   //  прописываем путь до файла index.html т.к. его нужно отдавать для того чтобы он отобразился в браузере
  const indexPath = path.join(__dirname, 'client', 'index.html')

  // вщзвращаем это клиенту, в случае если не один из запросов связанный на api, например, не отработал обозначаем это вот так '*'
  app.get('*',(req,res)=>{
    res.sendFile(indexPath)// отдаём 'index.html' клиенту с помощью метода sendFile
  })

} else {
  console.log(chalk.blueBright('Development'));
}

async function start() {
  try {
    mongoose.connection.once('open', () => {
      initDatabase();
    });
    await mongoose.connect(config.get('mongoUrl'));
    app.listen(PORT, () => {
      console.log(
        chalk.bgGreenBright(`Server has been started on port: ${PORT}...`)
      );
    });
  } catch (e) {
    console.log(chalk.red(e.message));
    process.exit(1);
  }
}

start();
