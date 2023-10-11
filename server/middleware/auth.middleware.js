const tokenService = require("../services/token.service");

module.exports = (req, res, next) => {
  if (req.mothod === 'OPTIONS') {
    // обходим системный метод options
    return next();
  }

  try {
    //  получим токен который находится в хэдерах, здесь будет формат Bearer  и сам токен 'wqdfrgasdwadawaedfaewefa'. Это всё строка поэтому мы её сплитуем и обращаемся к первому элементу вернувшегося от сплита к нам массиву, чтобы получить сам токен
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {// если токена нет возвращаем ошибку
      return res.status(401).json({ message: 'Unauthorized' });
    }

    //провалидируем сам токен, т.к. можно его подделать, делаем это через tokenService и метод по валидации accessToken'a, предварительно его напишем

    const data = tokenService.validateAccess(token)// если он его провалидировал и всё хорошо, то значит он его и распарсил

    if (!data) { //Таким образом мы проверим, корректный ли токен. Если токен не корректный, то пользователь не будет авторизован.
      return res.status(401).json({message: 'Unauthorized'})
    }

    // прелесть express заключается в том что мы можем модифицировать req и res и он будет виден также у нас в других методах

    req.user = data // добавляем свойство user которое будет соответствовать тем данным которые прилетели у нас в токене

    next()// очень важно вызвать здесь метод next чтобы middleware не прерывались и их цепочка не прекращалась

  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
