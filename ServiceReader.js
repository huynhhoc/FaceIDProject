const express        = require('express');
const app            = express();
const apiRoutes      = express.Router();
const fs             = require('fs');
const bodyParser     = require('body-parser');
const morgan         = require('morgan');
const mongoose       = require('mongoose');
const multer         = require('multer');
const jwt            = require('jsonwebtoken');          		// used to create, sign, and verify tokens
const config         = require('./config');              		// get our config file
const User           = require('./app/models/User');  			// get our mongoose model
const BangDiemDanh   = require('./app/models/BangDiemDanh');    // get our mongoose model
const LichThi        = require('./app/models/LichThi');
const port           = process.env.PORT || config.port;
const host           = config.host;
var datetime         = require('node-datetime');
var helper           = require('./UtilitiesHelper.js')

class ServiceReader{
    constructor(){
        this.initDB();
        this.initViewEngine();
        this.initExpressMiddleware();
        this.initRoutes();
        this.initRoutesSaveData();
        this.initRoutesUploadFile();
        this.initRoutesCreateUser();
        this.initRoutesGetAllData();
		this.initRoutesUpdateData();
        this.initRoutesSendQRCode();
        this.initRoutesQueryStudent();
		this.testExport();
        this.start();
    }
    start(){
		app.use(function (req, res, next) {
			res.setHeader('Access-Control-Allow-Origin', '*');
			next();
		});
        app.use('/api', apiRoutes);
        app.listen(port);
        helper.writeLog('Services IS-Tech at ' + config.host + ":" + port +"\n");
    }
    initViewEngine(){

    }
    initExpressMiddleware(){
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: false }));
        apiRoutes.use(bodyParser.json());
        apiRoutes.use(bodyParser.urlencoded({extended:  false}));
    }
    initRoutes(){
        app.set('superSecret', config.secret);                        
        app.use(morgan('dev'));
        app.get('/', function(req, res) {
            res.send('Welcome! The API of IS-Tech is at ' + config.host + ":" + port + '/api');
        });

        apiRoutes.get('/', function(req, res) {
          res.json({ message: 'Welcome to the API of IS-Tech!' });
        });
    }
    initDB(){
	mongoose.Promise = global.Promise;
	mongoose.connect(config.database, {useNewUrlParser : true}).catch(err => {
		helper.writeLog("Error: Could not connect to database, please check again.");
	});
    }
	testExport(){
		apiRoutes.get('/testExport', function (req, res){
			var json2xls = require('json2xls');
			var json = {
				foo: 'bar',
				qux: 'moo',
				poo: 123,
				stux: new Date()
			}

			var xls = json2xls(json);

			fs.writeFileSync('data.xlsx', xls, 'binary');
			res.send('OK');
		});
	}
	initRoutesSendQRCode(){
        apiRoutes.get('/getImage', function(req, res){
              try{
                 var tenanh = req.query.tenanh;
                 res.sendFile(config.pathToUploadFile+'/'+tenanh);
              }catch(ex){
                  helper.writeLog('Error: ' + ex);
              }
          });
        apiRoutes.post('/sendQRCode', function(req, res) {
			var dinhdanh 	= req.query.dinhdanh;
			var thoigian 	= req.query.thoigian;
			var thongtin 	= req.query.thongtin;
			var diadiem  	= req.query.diadiem;
			var tenanh   	= req.query.tenanh;
			var dochinhxac  = req.query.dochinhxac;
			var userid       = req.query.userid;
			var data = '';
			try {
				//save date to MongoDB
				var dt = new Date(thoigian)
				if (dochinhxac != undefined){
					data = '{ "UserID": \"' + userid + '\", \"DinhDanh\":\"'+ dinhdanh + '\", \"ThoiGian\":\"'+ thoigian + '\", \"ThongTin\":\"'+ thongtin + '\", \"DiaDiem\":\"'+ diadiem + '\", \"TenAnh\":\"'+ tenanh + '\", \"DoChinhXac\":\"'+ dochinhxac + '\" }'
				 }else{
					data = '{ "UserID": \"' + userid + '\", \"DinhDanh\":\"'+ dinhdanh + '\", \"ThoiGian\":\"'+ thoigian + '\", \"ThongTin\":\"'+ thongtin + '\", \"DiaDiem\":\"'+ diadiem + '\", \"TenAnh\":\"'+ tenanh+'\" }'; 
				 }
				 
				console.log("data: " + data)
				if (helper.isRecordNotInLastItem(thoigian, userid, config.interval)){
					var diemdanhSV = JSON.parse(data);
					var bangDiemDanh = new BangDiemDanh(diemdanhSV);
					bangDiemDanh.save()
					 .then(item => {
						 helper.writeLog(thoigian + " - " + dinhdanh + " - " + thongtin + " has been saved\n");
					  })
					 .catch(err => {
						 helper.writeLog(thoigian + " - " + dinhdanh + " - " + thongtin + " "  + err + " Unable to save to database, line 85 file ServiceReader.js\n");
						 res.status(400).send("Unable to save to database");
					  })
					helper.addLastItemtoList(userid, thoigian);
					res.end("OK:" + thoigian + " | " + userid + " | " + thongtin);
				}else{
					helper.writeLog(thoigian + " | " + userid + " | " + thongtin + " already exist\n");
					res.end("KO:" + thoigian + " | " + userid + " | " + thongtin);
				}
				
			} catch(err) {
				helper.writeLog("Error " + thoigian + " | " + dinhdanh + " | " + thongtin + " | " + err + " " + ", line 96 file ServiceReader.js\n");
			}
		});
    }
	initRoutesUpdateData(){
		apiRoutes.post('/updateDoChinhXac', function(req, res) {
		    try{
				var dinhdanh = req.query.dinhdanh;
				var dochinhxac = req.query.dochinhxac;
				var thoigian = req.query.thoigian;
				
				if (dinhdanh != undefined && dochinhxac != undefined && thoigian != undefined){
					
					var myquery = {"DinhDanh": dinhdanh,
							"ThoiGian": 
							{	$gt 	: thoigian - 60000,
								$lt		: thoigian + 60000
							}};
					var updateDCX = { $set: {"DoChinhXac": dochinhxac} };
					BangDiemDanh.findOne(myquery, function(err, res){
						helper.writeLog(res);
					});
					BangDiemDanh.updateOne(myquery, updateDCX, function(err, response){
						if (err){
							helper.writeLog(err);
							res.send("KO: " + err);
						}else{
							helper.writeLog("DoChinhXac of " + dinhdanh + " at " + new Date(1547546687000) + " has been updated to " + dochinhxac );
							res.send("OK: " + response);
						}
					  });
					
				}else{
				   helper.writeLog("Error: " + dinhdanh + " " + dochinhxac + " " + thoigian);
				   res.send("Error: " + dinhdanh + " " + dochinhxac + " " + thoigian);
				}
			}catch (ex){
				helper.writeLog("Error: " + ex);
				res.send("Error: " + ex);
			}
        });
	}
    initRoutesSaveData(){
        // route to export data from QRCode to MongoDB (POST http://localhost:10080/api/saveData)
        apiRoutes.post('/saveData', function(req, res) {
		  var data = JSON.stringify(req.body)
          var bangDiemDanh = new BangDiemDanh(req.body);
          bangDiemDanh.save()
             .then(item => {
				 helper.writeLog(data + " save OK \n");
                 res.send("export to database successfully");
              })
             .catch(err => {
				 helper.writeLog(data + " Unable to save to database \n");
                 res.status(400).send(data + " Unable to save to database");
              })
        });

		apiRoutes.post('/saveLichThi', function(req, res) {
			var hocphan    = req.query.hocphan;
			var namHoc     = req.query.namhoc;
			var hocky      = req.query.hocky;
			var Phong      = req.query.phong;
			var ngaythi    = req.query.ngaythi;
			var tietBD     = req.query.tietbd;
			var thoigian    = req.query.thoigian;
			try {
				var data = '{ "HocPhan": \"' + hocphan + '\", \"NamHoc\":\"'+ namHoc + '\", \"HocKy\":\"'+ hocky + '\", \"Phong\":\"'+ Phong + '\", \"NgayThi\":\"'+ ngaythi + '\", \"TietBD\":\"'+ tietBD + '\", \"ThoiGian\":\"'+ thoigian + '\" }'
				var lichThi = new LichThi(JSON.parse(data));
				lichThi.save()
				 .then(item => {
					 helper.writeLog(data + " has been saved\n");
				  })
				 .catch(err => {
					 helper.writeLog(data + " " + err + " Unable to save to database\n");
					 res.status(400).send("Unable to save to database");
				  })
			} catch(err) {
				helper.writeLog("Error: " + err);
			}
		});
    }

    initRoutesUploadFile(){
        apiRoutes.post('/uploadWithFileName', function(req, res){
			var storage = multer.diskStorage({
					destination: function (req, file, callback){callback(null, config.pathToUploadFile);},
					filename: function (req, file, callback){ callback(null, req.query.fileName);}
					});
			var uploadWithFileName = multer({storage: storage}).array("file");// Filename
			uploadWithFileName(req,res,function(err) {
				if(err) {
					helper.writeLog("Error upload file: " + req.query.fileName + " : " + err);
					return res.end("Error uploading file." + req.query.fileName);
				}
				helper.writeLog(req.query.fileName + " : File has been uploaded\n");
				res.end(req.query.fileName + " : File has been uploaded");
			});
            helper.writeLog(req.query.fileName + " : Upload file successfully\n");
            res.send(req.query.fileName + " : Upload file successfully");
            res.end();
        });

		apiRoutes.post('/upload', function(req, res){
			var storage = multer.diskStorage({
					destination: function (req, file, callback){callback(null, config.pathToUploadFile);},
					filename: function (req, file, callback){ callback(null, file.originalname);}
					});
			var upload = multer({storage: storage}).array("file");// Filename
			upload(req,res,function(err) {
				if(err) {
					//console.log("Error upload file: " + req.query.fileName + " : " + err);
					helper.writeLog("Error upload file: " + req.query.fileName + " : " + err);
					return res.end("Error uploading file." + req.query.fileName);
				}
				helper.writeLog(req.query.fileName + " : File has been uploaded");
				res.end(req.query.fileName + " : File has been uploaded");
			});
            helper.writeLog(req.query.fileName + " : Upload file successfully");
            res.send(req.query.fileName + " : Upload file successfully");
            res.end();
        });
    }
    initRoutesCreateUser(){
        app.get('/setup', function(req, res) {
           var user = new User({
            name:         'istech',
            password:   'istech',
            admin:      true
          });
          // save the user
          user.save(function(err) {
            if (err){
				helper.writeLog(err);
				res.send("KO: " + err);
			}

            console.log('User saved successfully');
            res.json({ success: true });
          });
        });

        apiRoutes.get('/users', function(req, res) {
          User.find({}, function(err, users) {
            res.json(users);
          });
        });
        app.post('/authenticate', function(req, res) {

          // find the user
          User.findOne({
            name: req.body.name
          }, function(err, user) {

                if (err){
					helper.writeLog(err);
					res.send("KO: " + err);
				}

                if (!user) {
                  res.json({ success: false, message: 'Authentication failed. User not found.' });
                } else if (user) {
                  // check if password matches
                  if (user.password != req.body.password) {
                    res.json({ success: false, message: 'Authentication failed. Wrong password.' });
                  } else {
                    // if user is found and password is right
                    // create a token with only our given payload
                    // we don't want to pass in the entire user since that has the password
                    const payload = { admin: user.admin };
                    var token = jwt.sign(payload, app.get('superSecret'));
                    // return the information including token as JSON
                    res.json({
                      success: true,
                      message: 'IS-Tech Token!',
                      token: token
                    });
                  }
                }
            });
        });
    }
    initRoutesGetAllData(){
        apiRoutes.get("/sinhvienAll", (req, res) => {
            BangDiemDanh.find({}, function(err, sinhvienAll) {
            if (err)
              res.send(err);
            res.json(sinhvienAll);
          });
        });
		apiRoutes.get("/exportSinhvienAll", (req, res) => {
            BangDiemDanh.find({}, function(err, sinhvienAll) {
            if (err)
              res.send(err);
            var filePath = config.pathTemplate + '/TemplateReportNormal.xlsx';
			var filePathReport = config.pathTemplate + '/Report.xlsx';
			res.setHeader('Content-Disposition', 'attachment; filename=Report.xlsx');
            res.setHeader('Content-Transfer-Encoding', 'binary');
            res.setHeader('Content-Type', 'application/octet-stream');
			helper.writeLog("Begin writeExcelFile");
			helper.writeExcelFile(filePath,filePathReport,"Report", sinhvienAll, 9);
			helper.writeLog("End writeExcelFile");
			res.sendFile(filePathReport);
          });
        });
		apiRoutes.get("/lichthiAll", (req, res) => {
            LichThi.find({}, function(err, lichthiAll) {
            if (err)
              res.send(err);
            res.json(lichthiAll);
          });
        });
    }
    initRoutesQueryStudent(){
		apiRoutes.post('/diemdanh', function(req, res) {
		    try{
				var data = JSON.stringify(req.body);
				var dataSV = JSON.parse(data);
				var listDinhdanh = dataSV["listDinhDanh"];
				if (listDinhdanh != undefined){
					//helper.writeLog("listDinhdanh: " + listDinhdanh);
					var sortDinhDanh = { "DinhDanh": 1, "ThoiGian": -1};
					var danhsachDD = listDinhdanh.split(";");
					var gioBD = dataSV["gioBD"];
					var gioKT = dataSV["gioKT"];
					var today = datetime.create().format('Y-m-d');
					if (gioBD == undefined){
						gioBD = today + " 0:0:0";
					}
					if (gioKT == undefined){
						gioKT = today + " 23:59:59";
					}
					var query = {"DinhDanh": danhsachDD,
							"ThoiGian": 
							{	$gte 	: new Date(gioBD).getTime(),
								$lt		: new Date(gioKT).getTime()
							}};
					BangDiemDanh.find(query).sort(sortDinhDanh).exec(function(err, sinhvien){
						if (err)
						  res.send(err);
					  /*
					    var listDiemDanh = '';
						var listTuple = "";
						var item = [];
						var tupleItem = "";
						var nextDinhDanh = 'None';
						var sv = sinhvien;
						sv.forEach(element => {
							if (nextDinhDanh != element["DinhDanh"]){
								if (nextDinhDanh != 'None'){
									item.push(JSON.parse("{\"DinhDanh\":\"" + nextDinhDanh + "\", \"ThongTin\": [" +  JSON.stringify(listTuple) + "] }"));							
									listTuple = "";
								}
								nextDinhDanh = element["DinhDanh"];
							}
							tupleItem = element["ThoiGian"] + ";" + element["DiaDiem"] + ";" + element["TenAnh"];
							listTuple = listTuple + "," + tupleItem;
						
						});
						
						item.push(JSON.parse("{\"DinhDanh\":\"" + nextDinhDanh + "\", \"ThongTin\": [" +  JSON.stringify(listTuple) + "] }"));
						*/
						res.json(sinhvien);
					});
				}else{
				   res.send("listDinhDanh is not defined");
				}
			}catch (ex){
				helper.writeLog("Error: " + ex);
				res.json("KO");
			}
        });
		
        apiRoutes.get('/sinhvien', function(req, res) {
          var query = {"DinhDanh": req.query.dinhdanh};

          BangDiemDanh.find(query, function(err, sinhvien) {
            if (err)
              res.send(err);
            res.json(sinhvien);
          });
        });

		apiRoutes.get('/diemDanhTrongNgay', function(req, res) {
		    try{
				var ngay = req.query.ngay 
				var query = {"DinhDanh": req.query.dinhdanh};
				helper.writeLog("Ngay: " + new Date(ngay + " 0:0:0").getTime() + " : " +  new Date(ngay + " 23:59:59").getTime())
				if (ngay != undefined && ngay !=""){
						query = {"DinhDanh": req.query.dinhdanh,
							"ThoiGian": 
							{	$gte 	: new Date(ngay + " 0:0:0").getTime(),
								$lt		: new Date(ngay + " 23:59:59").getTime()
							}
						};
				}
				BangDiemDanh.find(query, function(err, sinhvien) {
					if (err)
					  res.send(err);
					res.json(sinhvien);
				});
			}catch (ex){
				helper.writeLog("Error: " + ex);
				res.json("KO");
			}
        });
		
			apiRoutes.get('/exportDiemDanhTrongNgay', function(req, res) {
		    try{
				var ngay = req.query.ngay 
				var query = {"DinhDanh": req.query.dinhdanh};
				helper.writeLog("Ngay: " + new Date(ngay + " 0:0:0").getTime() + " : " +  new Date(ngay + " 23:59:59").getTime())
				if (ngay != undefined && ngay !=""){
						query = {"DinhDanh": req.query.dinhdanh,
							"ThoiGian": 
							{	$gte 	: new Date(ngay + " 0:0:0").getTime(),
								$lt		: new Date(ngay + " 23:59:59").getTime()
							}
						};
				}
				BangDiemDanh.find(query, function(err, sinhvien) {
					if (err)
					  res.send(err);
					var filePath = config.pathToUploadFile + '/TemplateReportNormal.xlsx';
					var filePathReport = config.pathToUploadFile + '/Report.xlsx';
					res.setHeader('Content-Disposition', 'attachment; filename=Report.xlsx');
					res.setHeader('Content-Transfer-Encoding', 'binary');
					res.setHeader('Content-Type', 'application/octet-stream');
					helper.writeExcelFile(filePath,filePathReport,"Report", sinhvien, 9);
					res.sendFile(filePathReport);
				});
			}catch (ex){
				helper.writeLog("Error: " + ex);
				res.json("KO");
			}
        });

		//Hocky, HocPhan, Namhoc ==> Ngay va TietBD
		// => tietBD => GioBD
		// => timeBD = Ngay + GioBD
		// => timeKT = Ngay + GioBD + thoigianThi
		apiRoutes.get('/diemDanhSVThi', function(req, res) {
		    var dinhdanh   = req.query.dinhdanh;
			var hocphan    = req.query.hocphan;
			var namHoc     = req.query.namhoc;
			var hocky      = req.query.hocky;
			var queryGioThi = {
				"HocPhan": req.query.hocphan,
				"NamHoc" : req.query.namhoc,
				"HocKy"  : req.query.hocky
			};
			LichThi.find(queryGioThi, function(err, lichthi){
				if (err){
					helper.writeLog("Error: " + err);
				}else{
					try{
						var lthi = lichthi[0]
						if (typeof(lthi) !='undefined' && lthi != null){
							var tietThi = datetime.create(lthi["NgayThi"] + " " + helper.getTimeTable(lthi["TietBD"]));
							
							var querySV = { 
									"ThoiGian": 
										{	$gte 	: new Date(helper.minusMinites(tietThi,15)).getTime(),
											$lt		: new Date(helper.addMinites(tietThi,parseInt(lthi["ThoiGian"]),10)).getTime()
										}
							};
							if (dinhdanh !='undefined' && dinhdanh != ""){
								querySV = { 
								"DinhDanh": dinhdanh,
								"ThoiGian": 
									{	$gte 	: new Date(helper.minusMinites(tietThi,15)).getTime(),
										$lt		: new Date (helper.addMinites(tietThi,parseInt(lthi["ThoiGian"]),10)).getTime()
									}
								};
							}
							BangDiemDanh.find(querySV, function(err, sinhvien) {
								if (err)
								  res.send(err);
								res.json(sinhvien);
							  });
						}else{
							res.send("KO");
						}
					}catch (ex){
						helper.writeLog("Error: " + ex);
					}
				}
			});
            
        });
    }
}
new ServiceReader()
