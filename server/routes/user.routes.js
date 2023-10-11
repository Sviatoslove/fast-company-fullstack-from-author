const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth.middleware')

const router = express.Router({ mergeParams: true });

router.patch('/:userId', auth, async (req, res) => {
  try {
    // получаем userId
    const { userId } = req.params; // это тотже userId, что и => router.patch(==>'/:userId'<==, ...

    // необходимо проверить равняется ли userId текущему user, т.к. изменять на клиенте, пользователь может только свои данные пользователя
    if (userId === req.user._id) {
      // если всё совпадает знчит обновляем юзера
      const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
        new: true, // этот флаг означает, что мы получаем обновлённые данные только после того, как они обновятся в БД, чтобы в этой константе на клиента не ушли старые данные
      });
      res.send(updatedUser);
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (e) {
    res
      .status(500)
      .json({ message: 'На сервере произошла ошибка. Попробуйте позже.' });
  }
});

router.get('/', auth, async (req, res) => {
  try {

    const list = await User.find(); // нашли всех юзеров в БД
    res.send(list); // отправили их на клиента с статус кодом 200(он указывается по умолчанию, если необходимо отправить данные с другим кодом, то необходимо его указать, например, res.status(400).send())
  } catch (e) {
    res
      .status(500)
      .json({ message: 'На сервере произошла ошибка. Попробуйте позже.' });
  }
});

module.exports = router;
