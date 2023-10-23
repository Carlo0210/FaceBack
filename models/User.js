const mongoose = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  userType: {
    type: String,
    enum: ['Admin', 'Event Organizer', 'Event Monitoring'],
    required: true,
  },
  name: {
    type: String,
    required: [true, "Can't be blank"],
  },
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: [true, "Can't be blank"],
    index: true,
    validate: [isEmail, 'Invalid email'],
  },
  password: {
    type: String,
    required: [true, "Can't be blank"],
  },
  activationDate: {
    type: Date,
    required: function () {
      return this.userType !== 'Admin';
    },
  },
  expirationDate: {
    type: Date,
    required: function () {
      return this.userType !== 'Admin';
    },
  },
  picture: {
    type: String,
  },
  userCreatedId: {
    type: String,
  },
}, { minimize: false });

UserSchema.pre('save', function(next){
  const user = this;
  if(!user.isModified('password')) return next();

  bcrypt.genSalt(10, function(err, salt){
    if(err) return next(err);

    bcrypt.hash(user.password, salt, function(err, hash){
      if(err) return next(err);

      user.password = hash
      next();
    })

  })

})


UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

UserSchema.statics.findByCredentials = async function (email, password) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid email or password');
  return user;
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
