var fs = require("fs-extra");

//--- validate length of string
exports.validateLeng = validateLeng;
function validateLeng(text, length) {

  if (text == undefined)
    text = "";
  if (text.length == length)
    return text;
  if (text.length > length)
    return text.substr(0, length)
  if (text.length < length) {
    var temp = length - text.length;
    for (var i = 0; i < temp; i++) {
      text = "0" + text;
    }
    return text;
  }

  return text;
}

//--- create folder name Order
exports.createFolderName = createFolderName;
function createFolderName(countfile, path) {

  var StringCountfile = validateLeng(countfile.toString(), 4);
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;
  var day = date.getDate();
  day = (day < 10 ? "0" : "") + day;
  var folderName = year + month + day + StringCountfile;

  //-- check foldername is unique
  var arr = fs.readdirSync(path);
  if (arr.indexOf(folderName) != -1) {
    folderName = createFolderName(countfile + 1, path);
  }

  return folderName;
}