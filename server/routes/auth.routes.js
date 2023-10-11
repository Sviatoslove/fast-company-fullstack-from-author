const express = require('express');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateUserData } = require('../utils/helpers');
const tokenService = require('../services/token.service');

const router = express.Router({ mergeParams: true });

router.post('/signUp', [
  check('email', 'Некорректный email').isEmail(),
  check('password', 'Минимальная длинна пароля 8 символов').isLength({
    min: 8,
  }),
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // если ошибки есть
        return res.status(400).json({
          error: {
            message: 'INVALID DATA',
            code: 400,
            errors: errors.array(),
          },
        });
      }

      const { email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: { message: 'EMAIL_EXISTS', code: 400 } });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = await User.create({
        ...generateUserData(),
        ...req.body,
        password: hashedPassword,
      });

      const tokens = tokenService.generate({ _id: newUser._id });

      await tokenService.save(newUser._id, tokens.refreshToken);

      res.status(201).send({ ...tokens, userId: newUser._id });
    } catch (e) {
      res
        .status(500)
        .json({ message: 'На сервере произошла ошибка. Попробуйте позже.' });
    }
  },
]);

router.post('/signInWithPassword', [
  check('email', 'Email не корректный').normalizeEmail().isEmail(),
  check('password', 'Пароль не может быть пустым').exists(),
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: 'INVALID_DATA',
            code: 400,
          },
        });
      }

      const { email, password } = req.body;

      const existingUser = await User.findOne({ email });

      if (!existingUser) {
        return res.status(400).json({
          error: {
            message: 'EMAIL_NOT_FOUND',
            code: 400,
          },
        });
      }

      const isPasswordEqual = await bcrypt.compare(
        password,
        existingUser.password
      );

      if (!isPasswordEqual) {
        return res.status(400).json({
          error: {
            message: 'INVALID_PASSWORD',
            code: 400,
          },
        });
      }

      const tokens = tokenService.generate({ _id: existingUser._id });
      await tokenService.save(existingUser._id, tokens.refreshToken);

      res.status(200).send({ ...tokens, userId: existingUser._id });
    } catch (e) {
      res
        .status(500)
        .json({ message: 'На сервере произошла ошибка. Попробуйте позже.' });
    }
  },
]);

router.post('/token', async (req, res) => {
  try {

    const {refresh_token:refreshToken} = req.body // получаю refresh_token из запроса и помещаю его в переменную refreshToken

    // проверить корректный ли это refreshToken, как минимум сравнить его с секретным ключом из config

    const data = tokenService.validateRefresh(refreshToken) // делаем это через метод tokenService - са, validateRefresh, который необходимо создать в tokenService, он возвращает нам результат сравнения. В data у нас  будет объект с данными включая userId 

    // получить из БД сам токен с помощью метода findToken который мы написали в tokenService'е

    const dbToken = await tokenService.findToken(refreshToken)

    if(isTokenInvalid(data, dbToken)) {// функция проверки на корректоность данных введённых для авторизации, если пользователь не авторизован отправляем соответственное сообщение
      return res.status(401).json({message: 'Unauthorized'})
    }

    // если if не выполнился то тогда обновляем все токены 
    const tokens = await tokenService.generate({_id: data._id})
    // обновляем их в БД
    await tokenService.save(data._id, tokens.refreshToken)

    res.status(200).send({...tokens, userId: data._id })

  } catch (e) {
    res
      .status(500)
      .json({ message: 'На сервере произошла ошибка. Попробуйте позже.' });
  }
});

// функция проверки на корректоность данных введённых для авторизации
function isTokenInvalid(data, dbToken) {
  return !data || !dbToken || data._id !== dbToken?.user?.toString()
}

module.exports = router;
