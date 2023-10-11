
/*--------------------------------8. Интеграция Backend & Frontend-------------------------------

----------------1. Пишем логику для работы с пользователями-----------------------------
 
  1. Убираем firebase из клиента, переходим в config.json ====>>

  {
    "apiEndpoint": "http://localhost:8080/api",
    "isFireBase": false
  }

  2. Далее идём в sevices и рефакторим auth.service.js

  const httpAuth = axios.create({
    baseURL: config.apiEndpoint + '/auth/', //убираем url серверов firebase ("https://identitytoolkit.googleapis.com/v1/") и устанавливаем api через конфиг + auth
    params: {
        key: process.env.REACT_APP_FIREBASE_KEY
    }
  });

  const authService = {
    register: async ({ email, password }) => {
        const { data } = await httpAuth.post(`signUp`, { // меняем url на регистрации(accounts:signUp)
            email,
            password,
            returnSecureToken: true
        });
        return data;
    },
    login: async ({ email, password }) => {
        const { data } = await httpAuth.post(`signInWithPassword`, { // меняем url на регистрации(accounts:signInWithPassword)
            email,
            password,
            returnSecureToken: true
        });
        return data;
    },
    refresh: async () => {
        const { data } = await httpAuth.post("token", { // токен должен быть окей
            grant_type: "refresh_token",
            refresh_token: localStorageService.getRefreshToken()
        });
        return data;
    }
  };

  3. Перейдём теперь в http.service.js

  const http = axios.create({
    baseURL: configFile.apiEndpoint
  });

  http.interceptors.request.use(
      async function (config) {
        const expiresDate = localStorageService.getTokenExpiresDate();// <<<=======================
        const refreshToken = localStorageService.getRefreshToken();// <<<=======================
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
        const isExpired = refreshToken && expiresDate < Date.now()
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
          if (configFile.isFireBase) {
              const containSlash = /\/$/gi.test(config.url);
              config.url =
                  (containSlash ? config.url.slice(0, -1) : config.url) + ".json";


    //  const expiresDate = localStorageService.getTokenExpiresDate();// вынесем на уровень выше
    // const refreshToken = localStorageService.getRefreshToken();// вынесем на уровень выше


    // дублируем всю логику этой проверки в случай если это не firebase
------------------------------------------------------------------------
              if (refreshToken && expiresDate < Date.now()) { <<=== вынесем эту повторяющююся строчку в отдельную переменную
----------------------------------------------------------------------------
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                if (isExpired) {
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

                  const data = await authService.refresh();

                  localStorageService.setTokens({
                    refreshToken: data.refresh_token,
                    idToken: data.id_token,
                    expiresIn: data.expires_in,
                    localId: data.user_id
                  });
              
              }
              const accessToken = localStorageService.getAccessToken();
              if (accessToken) {
                  config.params = { ...config.params, auth: accessToken };
              }
=====>>>>>} else {       <<<+++++++++++ //дублируем вот сюда и меняем параметры которые получаем с БД

------------------------------------------------------------------------
            if (refreshToken && expiresDate < Date.now()) { <<=== вынесем эту повторяющююся строчку в отдельную переменную
----------------------------------------------------------------------------
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                if (isExpired) {
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                const data = await authService.refresh();

                localStorageService.setTokens({// меняем тут данные 
                  refreshToken: data.refreshToken, // вместо refreshToken: data.refresh_token,
                  accessToken: data.accessToken, // вместо idToken: data.id_token,
                  expiresIn: data.expiresIn, // вместо expiresIn: data.expires_in,
                  userId: data.userId // вместо localId: data.user_id 
                }); // так как ключи и значения совпадают можем уменьшить эту запись следующим образом ===>>> localStorageService.setTokens(data);
            }
            const accessToken = localStorageService.getAccessToken();
            if (accessToken) {
                config.params = { 
                  ...config.params,
                   Authorization: `Bearer ${accessToken}` // вместо auth: accessToken делаем авторизацию через header
                };
            }
        }
        return config;
      },
      function (error) {
          return Promise.reject(error);
      }
  );
  function transormData(data) {
      return data && !data._id
          ? Object.keys(data).map((key) => ({
                ...data[key]
            }))
          : data;
  }
  http.interceptors.response.use(
      (res) => {
          if (configFile.isFireBase) {
              res.data = { content: transormData(res.data) };
          }
          return res;
      },
      function (error) {
          const expectedErrors =
              error.response &&
              error.response.status >= 400 &&
              error.response.status < 500;

          if (!expectedErrors) {
              console.log(error);
              toast.error("Somthing was wrong. Try it later");
          }
          return Promise.reject(error);
      }
  );

  4. Ещё один момент который мы сходу можем сделать, т.к. мы поменяли в localStorageService.setTokens названия в передаваемых аргументах, то нужно поменять названия в localStorage.service.js в localStorageService.setTokens в принимаемых параметрах: 

  export function setTokens({
    refreshToken,
    accessToken, // вместо idToken
    userId, // вместо localId
    expiresIn = 3600
  }) {
    const expiresDate = new Date().getTime() + expiresIn * 1000;
    localStorage.setItem(USERID_KEY, userId);// и здесь соответственно
    localStorage.setItem(TOKEN_KEY, accessToken);// и здесь соответственно
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(EXPIRES_KEY, expiresDate);
  }

  5. Попробуем сделать первоначальный запуск
    npm start
  
*/

//----------------------------------------------------------------------------------------------

/*=====================================2. Исправляем ошибку CORS=====================

  1. Ошибка CORSA  смотри скриншот 1
    Решаем проблему на сервере, останавливаем сервак и пишем npm install cors. Это специальный дополнительный пакет который мы можем подключить или использовать в качестве middleware. Подключаем его в app ===>>>

    const cors = require('cors')
    app.use(cors())// подключаем эту строку перед роутами

    Проблема решена!!!
*/

//----------------------------------------------------------------------------------------------

/*=====================================3. Исправляем ошибки при регистрации=====================

  1. Необходимо очистить всех пользователей и токены из БД, т.к. эти данные не полные, чтобы избежать потенциальных проблем в нашем приложении.  
  2. Логин вроде бы работает, а signUp выдаёт ошибку и проблема в том, что для firebase мы трансформируем данные в массив, т.к. к нам приходит объект, сенйчас же к нам приходит сразу массив и поэтому данные трансформировать не нужно, в http.service.js вносим доп строчку  
  ====>>>>
  http.interceptors.response.use(
      (res) => {
          if (configFile.isFireBase) {
              res.data = { content: transormData(res.data) };
          }
          res.data = { content: res.data };  <<<<+++++++++++++++
          return res;
      },
      function (error) {
          const expectedErrors =
              error.response &&
              error.response.status >= 400 &&
              error.response.status < 500;

          if (!expectedErrors) {
              console.log(error);
              toast.error("Somthing was wrong. Try it later");
          }
          return Promise.reject(error);
      }
  );

  3. Снова ошибка и идём в users.js в метод signUp ===>

  export const signUp =
    (payload) => /// меняем здесь параметры({ email, password, ...rest }) на payload
    async (dispatch) => {
        dispatch(authRequested());
        try {
            const data = await authService.register(payload);/// меняем здесь параметры({ email, password }) на payload
            localStorageService.setTokens(data);
            dispatch(authRequestSuccess({ userId: data.userId }));// здесь localId меняем userId

            теперь юзера мы создаём на бекэнде поэтому удаляем часть этого кода и всё что с ним связано в файле
  --------------------------------------------------
            dispatch(
                createUser({
                    _id: data.localId,
                    email,
                    rate: getRandomInt(1, 5),
                    completedMeetings: getRandomInt(0, 200),
                    image: `https://avatars.dicebear.com/api/avataaars/${(
                        Math.random() + 1
                    )
                        .toString(36)
                        .substring(7)}.svg`,
                    ...rest
                })
            );
  ---------------------------------------------------------

        } catch (error) {
            dispatch(authRequestFailed(error.message));
        }
    };

    4. Осталась ещё ошибка которая из-за того, что наши headers  отправляется query параметрами в api скриншот 2
    Поэтому в http.service в http.interceptors.request.use меняем ====>>>>

    http.interceptors.request.use(
    async function (config) {
        const expiresDate = localStorageService.getTokenExpiresDate();
        const refreshToken = localStorageService.getRefreshToken();
        const isExpired = refreshToken && expiresDate < Date.now();

        if (configFile.isFireBase) {
            const containSlash = /\/$/gi.test(config.url);
            config.url =
                (containSlash ? config.url.slice(0, -1) : config.url) + ".json";

            if (isExpired) {
                const data = await authService.refresh();

                localStorageService.setTokens({
                    refreshToken: data.refresh_token,
                    idToken: data.id_token,
                    expiresIn: data.expires_in,
                    localId: data.user_id
                });
            }
            const accessToken = localStorageService.getAccessToken();
            if (accessToken) {
                config.params = { ...config.params, auth: accessToken };
            }
        } else {
            if (isExpired) {
                const data = await authService.refresh();

                localStorageService.setTokens(data);
            }
            const accessToken = localStorageService.getAccessToken();
            if (accessToken) {
              меняем здесь params на headers
              ---------------------------------------------------------
                config.headers = {
                    ...config.headers,
                    Authorization: `Bearer ${accessToken}`
                };
                ----------------------------------------------------------
            }
        }
        return config;
    },
    function (error) {
        return Promise.reject(error);
    }
);


-------------------------------------9. Deployment-------------------------------------------

    ----------------------1. Что такое Deployment и зачем нужен Docker ------------------------
     смотреть видео https://lk.result.school/pl/teach/control/lesson/view?id=260346531

----------------------------------------------------------------------------------------------

    ------------------2. Реализовываем Production mode для сервера------------------------ 
        смотреть видео https://lk.result.school/pl/teach/control/lesson/view?id=260346532

        В client запускаем npm build и получаем папочку build


        Создадим папку client в папке server и копируем туда всё содержимое папочки build для того чтобы ....
        (это временное действие для того чтобы проверить работает продакшион или нет, можно и прописать прямой путь не копируя содержимое папки build на сервер)

        Далее прописываем в проверке на Production следующюю логику 
        ====>
        if (process.env.NODE_ENV === 'production') {
            console.log(chalk.blueBright('Production')); // инфо строчка
            // если мы запускаем сервак в продакшщн моде то тогда по адресу '/' мы должны отдавать статическую папочку build
            app.use('/', express.static(path.join(__dirname, 'client')))// если мы запрашиваем корневой url => '/' то тогда мы добавляем middleware express.static в который передаём правильный путь до статической папки

            //  прописываем путь до файла index.html т.к. его нужно отдавать для того чтобы он отобразился в браузере
            const indexPath = path.join(__dirname, 'client', 'index.html')

            // возвращаем это клиенту, в случае если не один из запросов связанный на api, например, не отработал обозначаем это вот так '*'
            app.get('*',(req,res)=>{
                res.sendFile(indexPath)// отдаём 'index.html' клиенту с помощью метода sendFile
            })

        } else {
            console.log(chalk.blueBright('Development'));// инфо строчка
        }

------------------------------------------------------------------------------------------------------

        --------------------------3. Настраиваем Docker------------------------------

        1. Устанавливаем и запускаем docker
        2. В папочке client создаём файл .dockerignore сюда запишем те файлы и папки которые нам нужно проигнорировать, чтобы они не помещались в наши контейнеры в docker'e  это будет node_modules и build. И тоже самое сделаем для папочки server и поместим в неё папочку node_modules. Дабы нам не передовать лишнего по интернету и не складывать в контейнер.
        3. Теперь в корне приложения создаём Dockerfile пишется с большой буквы слитно и без camelcase и без расширения. Это файл инструкция который будет говорить технологии docker что ей нужно будет делать с приложением.
        4. Проработаем концепцию инструкции для docker'a, т.е. что он должен сделать с нашим приложением:
        --- У нас есть клиент и сервер. Вначале нам нужно перейти в клиент, установить все зависимости, т.е. вызвать npm install и запустить всё в build=> содержимое папочки build скопировать в папку client которую нужно создать в папке server => установить все зависимости и запустить в production модэ
        Dockerfile =>

        ------------------------Client Part

        1. FROM node:18 --- с помощью ключевого слова FROM мы говорим с помощью какой платформы мы хотим взаимодействовать

        2. WORKDIR /app/client --- с помощью ключевого слова WORKDIR мы говорим в какой директории и с какой папкой мы хотим работать внутри docker'a

        3. Следующим шагом нам необходимо скопировать локальные папки и файлы из client в образ самого docker'a, в первую очередь необходимо скопировать package.json =>

        COPY client/package.json /app/client/ ---- с помощью ключевого слова COPY мы говорим, что мы хотим что-то копировать и через пробел говорим откуда и что нам нужно скопировать и ещё через пробел указываем директорию куда нам нужно скопировать уже в docker'e

        4. После этого необходимо вызвать npm install с помощью ключевого слова RUN => RUN npm install

        5. После того как всё это завершилось, я копирую весь остальной код приложения 

        COPY client /app/client/ --- копируем весь client в /app/client/

        6. И дальше запускаем всё в client в build 

        RUN npm run build
---------------------------------------------------------------------
        это часть работы связанная с клиентской состовляющей
        ------------------------------------------------------------------

-----------------------------------Server Part

        1. FROM node:alpine --- с помощью ключевого слова FROM мы говорим с помощью какой платформы мы хотим взаимодействовать, alpine-на момент времени последняя актуальная версия

        2. WORKDIR /app

        3. COPY server/package.json /app --- копируем package.json из сервера в корневую папку в docker'e а именно в app

        4. RUN npm install --- устанавливаем зависимости

        5. COPY server /app --- копируем остальные файлы и папки из папочки server в рабочюю директорию в docker'e

        6. после этого нам необходимо из папочки client скопировать содержимое папочки build и перенести его в сервер

        COPY --from=client /app/client/build /app/client ---  COPY --from=client - это мы говорим что мы хотим скопировать что-то из клиента уже в docker файле, через пробел указываем путь того что мы хотим скопировать и ещё через пробел- путь -куда скопировать, но всё это уже происходит внутри самого docker'a

        7. С помощью ключевого слова EXPOSE мы говорим какой порт у нас работает в docker контейнере 

        EXPOSE 8080 --- наш сервер всегда запускается на порту 8080

        8. И чтобы это всё работало необходимо запустить production мод нашего приложения

        CMD [ "npm", "start" ]

        ---------------------------------------
        теперь мы можем построить первый образ

*/


// ___________________________+++++++++++++++++++++++++++++++++++++++++++++++++


/*-------------------------------4. Запускаем приложение в Docker контейнере-------------------------

        1. Строим образ при помощи команды 
         docker build -t [название образа] --- с помощью флага -t присваиваем название образу
        ==>> docker build -t jfd-fast-company . --- и через пробел после названия говорим где искать инстукцию, т.е. Dockerfile, точка говорит о том что инструкция находится в этой папке в которой мы находимся в консоли, а именно в корневой папке проекта

        2. Как нам проверить что всё получилось => docker image ls

        3. На основе этого образа мы можем запустить контейнер и посмотреть работает ли наше приложение

            docker run -d -p 8080:8080 --name jfd-fast-company --rm jfd-fast-company

        4. docker ps -a --- посмотреть данные контейнера.
*/



// ___________________________+++++++++++++++++++++++++++++++++++++++++++++++++


/*-------------------------------5. Настраиваем VPS-------------------------

        

*/
