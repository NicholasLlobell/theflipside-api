const { Schema, model } = require('mongoose')

const commentSchema = new Schema({
    comment: String,
    author: {type: Schema.Types.ObjectId, ref: "User"}
}, 
{
    timestamps: true
})

module.exports = model("Comment", commentSchema)