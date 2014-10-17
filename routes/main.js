var fs = require("fs-extra");
var phantom = require('phantom');
var MailParser = require("mailparser").MailParser;
var jade = require('jade');
var CONFIG = require("../config");
var _ = require("underscore");
//var Template = require("./gnrt.js");

exports.process = function(){
  // Read Folder Emls
  var emlNames = fs.readdirSync(CONFIG.EML_DIR);
  console.log("length: ", emlNames.length);
  processAnEmlFile(0, emlNames);
};

function processAnEmlFile(index, emlNames){
  if(index < emlNames.length){
    fs.readFile(CONFIG.EML_DIR+emlNames[index], function(err, emlFileContent){
      if(!err){
        var name = "";
        try{
          name = emlNames[index].replace(".eml", "");
          fs.mkdirSync(CONFIG.PDF_DIR+name);
          fs.mkdirSync(CONFIG.PDF_DIR+name+"/attachments/");
        }
        catch(err){

        }
        parseEml(emlFileContent, function(emlObject){
          if(emlObject.html || emlObject.from){
            var resultEml = creatEmlObjectForHtml(name, emlObject);
            createHtmlAndPdfFiles(name, resultEml, function(){
              console.log("Next File");
              processAnEmlFile(index+1, emlNames);
            });
          } else{
          }
        });
      }
      else{
      }
    });
  }else{
    console.log("DONE !!!");
    return;
  }

};

//=== CREAT EML OBJECT FROM EMLOBJECT_PARSER

function creatEmlObjectForHtml(emlName, oEml){
  try {
    // ==== REPLACE IMAGE CONTENT ====
    var resultEml={};
    var dictImg = {};
    var arrAtt = [];
    var htmlContent = "";
    try {
      htmlContent = oEml.html;
    }
    catch(exception){
      try {
        htmlContent = oEml.comments;
      }
      catch(exep){
        console.log("html is emtry");
      }
    }
    if (oEml.attachments != undefined) {  // hash dictionary
      var j = 0;
      for (var i = 0; i < oEml.attachments.length; i++) {
        var dictAtt = {};
        if(oEml.attachments[i].contentDisposition != 'LOL'){ // attachments is INLINE (images,..)
          var key = "cid:" + oEml.attachments[i].contentId;
          var templ = new Buffer(oEml.attachments[i].content, 'binary').toString('base64');
          var value = "data:" + oEml.attachments[i].contentType + ";base64," + templ;
          dictImg[key] = value;
//        }
//        else{ // attachments is file
          dictAtt.name = oEml.attachments[i].fileName;
          fs.writeFileSync(CONFIG.PDF_DIR+emlName+"/attachments/"+dictAtt.name, new Buffer(oEml.attachments[i].content, 'base64'));
          arrAtt[j] = dictAtt;
          j++;
        }
      }

      resultEml['attachments'] = arrAtt;
      // Loop through all images in EML
      for (var keys in dictImg) {
        htmlContent = htmlContent.replace(keys, dictImg[keys]);
      }
    }
    // ==== UTF8 ENCODE ====
    try{
      htmlContent = htmlContent.replace('<html>', '<html>' + '\n' + '<meta http-equiv="Content-type" content="text/html; charset=utf-8" />');
    }
    catch(abc){
      console.log("Can't display email to html", abc);
    }

    // ==== RENDER HTML ====

    resultEml['html']=htmlContent;
    resultEml['from']=oEml.from[0].address;
    var to = '';
    var cc = '';
    try{
      for(var i=0; i<oEml.to.length; i++){
        to = to + oEml.to[i].name + '  ' + oEml.to[i].address + '; ';
      }
      for(var j=0; j<oEml.cc.length; j++){
        cc = cc + oEml.cc[j].name + '  ' + oEml.cc[i].address + '; '
      }
    }
    catch(abc){

    }
    resultEml['to']=to;
    resultEml['cc']=cc;
    resultEml['subject']=oEml.subject;
    resultEml['time']=oEml.headers['date'];
    resultEml['bodyContent']=htmlContent;
  }
  catch (exep) {
    console.log("Can't display email to html", exep);
  }
  return resultEml;
};

//=== PARSE EML OBJECT FROM DATA OF EML FILE.
function parseEml(emlFileContent, callback){
  var mailParser = new MailParser();

  mailParser.write(emlFileContent);
  mailParser.once("end", function(oEml){
      callback(oEml);
  });
  mailParser.end();
}

//=== CREATE STACK FOLDER, PDF FROM EML_FILE
function createHtmlAndPdfFiles(emlName, resultEml, callback){  //--- req and res use to save variables, render html using phantom
  var date = new Date();
  var pathFileHtml = 'public/HTMLs/'+/*date.toDateString()+'_'+*/date.getHours()+'_'+date.getMinutes()+'_'+date.getSeconds()+'_'+date.getMilliseconds()+'_EmailArchiver.html';
  var pathFileHtmlGet = pathFileHtml.replace("public","");

  //--- get HTML content of jade pdf
  var bodyString = fs.readFileSync('./views/HTMLTEMPLATES/basic.html');
  var body = _.template(bodyString.toString(), {eml: resultEml});
  console.log("body: ",body);
  var freeport = Math.floor((Math.random()*10000)+1);
  phantom.create({'port': freeport},function(ph){
    ph.createPage(function(page){

      // CONFIG PDF PAGE
      page.set('viewportSize', {width: 1600});
      page.set('paperSize', {format: 'A4'});
      page.set('zoomFactor', 1);

      // WRITE EML TO HTML
      try{
//        body = body + "</body></html>";
        fs.writeFileSync(pathFileHtml, body);
        console.log('write file complete');
      }
      catch(exception){
        console.log("in catch___pathFileHtml:"+pathFileHtml);
      }

      // RENDER PDF
      page.open('http://localhost:3300'+pathFileHtmlGet, function (status) {
        page.render(CONFIG.PDF_DIR+emlName+"/"+emlName+".pdf", function(){
          ph.exit();
          fs.unlinkSync(pathFileHtml);//--- remove html file
          callback();
        });
      });
    });
  });
}
