const express = require('express');
const auth = require('../middleware/auth.middleware');
const Comment = require('../models/Comment');
const c = require('config');
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(auth, async (req, res) => {
    try {
      const { orderBy, equalTo } = req.query;
      const list = await Comment.find({ [orderBy]: equalTo }); //получаем список всех комментариев
      res.send(list); // отправили их на клиента с статус кодом 200
    } catch (e) {
      res
        .status(500)
        .json({ message: 'На сервере произошла ошибка. Попробуйте позже.' });
    }
  })
  .post(auth, async (req, res) => {
    try {
      const newComment = await Comment.create({// ждём пока создадим комментарий
        ...req.body, // здесь у нас прилетают все необходимые данные
        userId: req.user._id// добавляем здесь id, т.к. у нас в модели коммента есть userId
      })
      res.status(201).send(newComment)// отправляем созданный коммент со статусом 201(что-то создано) на клиента
    } catch (e) {
      res
        .status(500)
        .json({ message: 'На сервере произошла ошибка. Попробуйте позже.' });
    }
  });

router.delete('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params// получаем параметр commentId
    //const removedComment = await Comment.find({ _id: commentId }) или ===>>>
    const removedComment = await Comment.findById(commentId) // найдём комментарий который нужно удалить
    if(removedComment.userId.toString() === req.user._id) {// проверить, а можем ли мы удалять комментарий, т.к. его может удалять только тот пользователь который его оставлял
      await removedComment.deleteOne()// ждём пока удалится коммент
      return res.send(null)// можем вернуть null, т.к. на фронте мы ничего не ждём
    }else {// иначе отправляем ошибку авторизации
      return res.status(401).json({message: 'Unauthorized'})
    }
  } catch (e) {
    res
      .status(500)
      .json({ message: 'На сервере произошла ошибка. Попробуйте позже.' });
  }
});

module.exports = router;
