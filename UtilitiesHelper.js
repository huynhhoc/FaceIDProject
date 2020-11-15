 var fs 		    = require('fs');
 var config         = require('./config'); 
 var Request 		= require("request");
 var lastItems 		= new Array();
 var datetime 		= require('node-datetime');
 function addLastItemtoList(userID, thoigian){
	record = userID + "|" + thoigian;
	writeLog("them vao danh sach: " + record)
	if (lastItems.length < config.numRecordBuffer){
	   lastItems.push(record)
	}else{
		for (var index = 0; index < lastItems.length -1 ; index++){
			lastItems[index] = lastItems[index+1]
		}
		lastItems[lastItems.length] = record
	}
}
function writeLog(record){
	var dateTime = require('node-datetime');
    var dt = dateTime.create().format("Y-m-d H:M:S");
	record = "["+ dt + "] : " + record;
	console.log(record);
	fs.appendFile(config.fileBackup, record, function (err) {
	   if (err) throw err;
	});
}
function addMinites(currenDate, minutes){
	try{
		return datetime.create(currenDate.getTime() + minutes*60000).format("Y-m-d H:M:S")
	}catch (ex){
		writeLog("Error : " + ex + " funtion addMinites of file UtilitiesHelper.js")
		return 
	}
}
function minusMinites(currenDate, minutes){
	try{
		return datetime.create(currenDate.getTime() - minutes*60000).format("Y-m-d H:M:S")
	}catch (ex){
		writeLog("Error : " + ex + " funtion minusMinites of file UtilitiesHelper.js")
		return 
	}
}
function getTimeTable(tietThi){
	var tiet = config.tiet1; 
	switch (tietThi) {
	  case "1":
		tiet = config.tiet1;
		break;
	  case "2":
		 tiet = config.tiet2;
		break;
	  case "3":
		tiet = config.tiet3;
		break;
	  case "4":
		tiet = config.tiet4;
		break;
	  case "5":
		tiet = config.tiet5;
		break;
	  case "6":
		tiet = config.tiet6;
		break;
	  case "7":
		tiet = config.tiet7;
		break;
	  case "8":
		 tiet = config.tiet8;
		break;
	  case "9":
		tiet = config.tiet9;
		break;
	  case "10":
		tiet = config.tiet10;
		break;
	  case "11":
		tiet = config.tiet11;
		break;
	  case "12":
		tiet = config.tiet12;
	}
	return tiet;
}

function isRecordNotInLastItem(thoigian, userID, interval){
	if (lastItems.length == 1)
		return true
	try{
		//var rePattern = new RegExp(/ĐỊNH DANH: (.*)$/);
		//var dtime = record.split(";")		
		var currentDateTime = datetime.create(thoigian.trim());
		for (var index = 0; index < lastItems.length; index++){
		  //userID + "|" + thogian
		  var item = lastItems[index].split("|");
		  var itemDinhdanh = item[0].trim();
		  var itemDateTime = datetime.create(item[1].trim());
		  console.log("itemDateTime: "+ itemDateTime.getTime())
		  var diff = Math.abs(currentDateTime.getTime() - itemDateTime.getTime());
		  diff = diff/60000 - interval
		  console.log ("kiemtra: " + itemDinhdanh.includes(userID) + " : " + diff)
		  if (itemDinhdanh.includes(userID) && diff < 0){
			  return false
		  }
		}
		return true
	}catch (ex) {
		//console.log('Error: Invalid format: ' + ex +  " funtion isRecordNotInLastItem of file UtilitiesHelper.js");
		writeLog("Error: Invalid format: " + ex + " funtion isRecordNotInLastItem of file UtilitiesHelper.js\n");
		return false
	}
}
function sendRecordToShowPopUp(dinhdanh, thongtin){
	Request.post({
		"headers:": {
		    'Content-Type': 'application/form-data'
		},
		"url": config.urlPopUp,
		"form": {
			"dinhdanh": dinhdanh,
			"thongtin": thongtin
		}
		}, (error, response, body) => {
			if(error) {
				writeLog(error);
			}
			writeLog("Send to show popup: " + dinhdanh + "thongtin: " + thongtin + "\n");
	});
}
function writeExcelFile2(filename, filePathReport,sheetName,data, position){
	return new Promise((resolve, reject) => {
		var fileResult = false
		var Excel = require('exceljs');
		var workbook = new Excel.Workbook();
		var dateFormat = require('dateformat');
		workbook.xlsx.readFile(filename)
		  .then(function() {
			var ws = workbook.getWorksheet(sheetName);
			var columnA = 'A';
			var columnB = 'B';
			var columnC = 'C';
			var columnD = 'D';
			var columnE = 'E';
			var columnF = 'F';
			var columnG = 'G';
			var count   = 1;
			writeLog("Begin Append data here ..............");
			data.forEach(element => {
				writeLog("item number: " + element["UserID"]);
				ws.getCell(columnA + (count + position).toString()).value = count;
				ws.getCell(columnB + (count + position).toString()).value = element["UserID"];
				ws.getCell(columnC + (count + position).toString()).value = element["DinhDanh"];
				ws.getCell(columnD + (count + position).toString()).value = element["ThongTin"];
				ws.getCell(columnE + (count + position).toString()).value = element["DiaDiem"];
				ws.getCell(columnF + (count + position).toString()).value = dateFormat(new Date(element["ThoiGian"]), "dddd, mmmm dS, yyyy, h:MM:ss TT");
				ws.getCell(columnG + (count + position).toString()).value = element["DoChinhXac"];
				count = count + 1;
			});
			writeLog("Done Append data................");
			fileResult = workbook.xlsx.writeFile(filePathReport);
		  })
		  setTimeout(() => {
			  resolve(fileResult);
		  }, 300);
		  
	});
}
async function writeExcelFile(filename, filePathReport,sheetName,data, position) {
  try {
    fileResult = await writeExcelFile2(filename, filePathReport,sheetName,data, position);
	setTimeout(() => {
			  return fileResult;
	}, 300);
  } catch(err) {
    console.log(err);
	return false;
  }
}
// exports the variables and functions above so that other modules can use them
module.exports.writeLog = writeLog;
module.exports.addLastItemtoList = addLastItemtoList;
module.exports.isRecordNotInLastItem = isRecordNotInLastItem;
module.exports.sendRecordToShowPopUp = sendRecordToShowPopUp;
module.exports.lastItems = lastItems;
module.exports.addMinites = addMinites;
module.exports.minusMinites = minusMinites;
module.exports.getTimeTable = getTimeTable;
module.exports.writeExcelFile = writeExcelFile;
