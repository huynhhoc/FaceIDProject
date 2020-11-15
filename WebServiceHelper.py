#!/usr/bin/env python3
# -*- coding: utf-8 -*-
__author__="hthoc@..."
__date__ ="$05-01-2019$"

import requests
import os
import re
import json
import datetime
from LogFile import LogFile
import urllib.request
from ldap3 import Server, Connection, ALL

import email, smtplib, ssl
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import config

BASEDN = "dc=,dc=vn"

BASEUSERS = "ou=,dc=," + BASEDN

PROXYUSER = "cn=," + BASEDN
PROXYUSER_PASS = ""

LDAPADM = "cn=," + BASEDN
LDAPADM_PASS = ""

LDAP_PORT = 
LDAP_SERVER = ""

class WebServiceHelper:
    def __init__(self, logfile, apiWS,urlPopUp, urlFace, rootDir="/etc/itd/cloudcam/ID-Reader", accuracy = 0.6):
        self.apiWS      = apiWS
        self.urlPopUp   = urlPopUp
        self.urlFace    = urlFace
        self.consoleLog = LogFile(logfile)
        self.rootDir    = rootDir
        self.accuracy   = accuracy

    def callWSToSaveData(self, recordJson):
        formData = json.loads(recordJson)
        try:
            requests.post(self.apiWS + '/saveData', data= formData)
        except requests.RequestException:
            self.consoleLog.showLog ('Sorry: Please check saveData API IS-Tech.\n')
            raise Exception("Sorry: Please check saveData API IS-Tech.")
            #return False
        return True
    
    def sendEmail(self, receiver_email,receiver_emailBCC,subject,body,filename):
        # Create a multipart message and set headers
        message = MIMEMultipart()
        message["From"] = config.SENDER_EMAIL
        message["To"] = receiver_email
        message["Subject"] = subject
        message["Bcc"] = receiver_emailBCC  # Recommended for mass emails

        # Add body to email
        message.attach(MIMEText(body, "plain"))
        # Open PDF file in binary mode
        with open(filename, "rb") as attachment:
            # Add file as application/octet-stream
            # Email client can usually download this automatically as attachment
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())

        # Encode file in ASCII characters to send by email    
        encoders.encode_base64(part)

        # Add header as key/value pair to attachment part
        part.add_header(
            "Content-Disposition",
            f"attachment; filename= {filename}",
        )

        # Add attachment to message and convert message to string
        message.attach(part)
        text = message.as_string()

        # Log in to server using secure context and send email
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(config.SMTP_MAIL,config.SMTP_PORT, context=context) as server:
            server.login(config.SENDER_EMAIL, config.SENDER_PASSWORD)
            server.sendmail(config.SENDER_EMAIL, receiver_email, text)

    def get_info(self, valueSearch):
       # Create the Server object with the given address.
       server = Server(config.LDAP_SERVER, get_info=ALL)
       #Create a connection object, and bind with the given DN and password.
       try: 
           conn = Connection(server, config.PROXYUSER, config.PROXYUSER_PASS, auto_bind=True)
           self.consoleLog.showLog('LDAP Bind Successful.')
           # Perform a search for a pre-defined criteria.
           # Mention the search filter / filter type and attributes.
           usfilter = "(&(objectClass=person)(uid=%s))" %(str(valueSearch))
           print ('usfilter: ' + usfilter)
           conn.search(search_base = config.BASEUSERS, search_filter = usfilter, attributes=['uidNumber', 'iDAccountName','mailForwardingAddress'])
           # Print the resulting entries.
           self.consoleLog.showLog('uidNumber of ' + valueSearch + ' is ' + str(conn.entries[0]['uidNumber']) + ' email forward: ' +  str(conn.entries[0]['mailForwardingAddress']))
           return str(conn.entries[0]['uidNumber']),str(conn.entries[0]['iDAccountName']), str(conn.entries[0]['mailForwardingAddress'])
       except Exception as e:
           # If the LDAP bind failed for reasons such as authentication failure.
           self.consoleLog.showLog ('LDAP Bind Failed: ' + str(e))
           return False,False, False
       return False,False, False
    
    def callWSToSendQRCode(self, userID, userName,receive_email,dinhdanh, thoigian, thongtin, diadiem, tenanh,dochinhxac,pathfile, thoigianOrg):
        flag = False
        try:
            urlQRCode = self.apiWS + '/sendQRCode?userid='+userID + '&dinhdanh='+dinhdanh+'&thoigian='+thoigian+'&thongtin='+thongtin+'&diadiem='+diadiem +'&tenanh=' + tenanh
            if float(dochinhxac) >= self.accuracy:
                urlQRCode = urlQRCode + '&dochinhxac=' + str(dochinhxac)
                
            r = requests.post(urlQRCode)
            
            status = r.text
            statusOK = status.split(":")[0]
            if statusOK == 'OK':
               subject = "[IS-TECH] Điểm danh ngày " + thoigianOrg + " tại Kios " + diadiem
               body = "Kính gửi " +  userName + ", \n Bạn vừa mới điểm danh thành công vào lúc " + thoigianOrg + " tại Kios " + diadiem + ". Bạn có thể xem thông tin điểm danh của bạn khi bạn truy cập vào hệ thống login.is-tech.vn. \n Đây là thông báo tự động từ bộ phận hỗ trợ support@cloudgate.vn, bạn không cần trả lời lại thông báo này."
               self.sendEmail(receive_email,config.SENDER_EMAIL,subject,body,pathfile)
               self.consoleLog.showLog (dinhdanh + ' saved Ok\n')
               flag = True
            else:
               self.consoleLog.showLog (dinhdanh + ' already exist\n')
               flag = False
        except requests.RequestException:
            self.consoleLog.showLog ('Sorry: Please check saveData API IS-Tech.\n')
            #raise Exception("Sorry: Please check saveData API IS-Tech.")
            flag = False
        return flag

    def callWSToShowPopup(self, dinhdanh, thongtin, thoigian, diadiem):
        try:

            formData = {'dinhdanh': dinhdanh, 'thongtin': thongtin, 'thoigian': thoigian, 'diadiem': diadiem}
            requests.post(self.urlPopUp + '/', headers = {}, data = formData)
            self.consoleLog.showLog ('Show Pop up is OK')
        except requests.RequestException:
            self.consoleLog.showLog ('Error: Please check API Show PopupIS-Tech.\n')
            raise Exception("Sorry, Please check API Show PopupIS-Tech.")
            #return False
        return True
		
    def callWSToUpdateDoChinhXac(self, dinhdanh, thoigian, dochinhxac):
        flag = False
        try:
            r = requests.post(self.apiWS + '/updateDoChinhXac?dinhdanh='+dinhdanh+'&thoigian='+thoigian+'&dochinhxac='+dochinhxac)
            status = r.text
            statusOK = status.split(":")[0]
            if statusOK == 'OK':
               self.consoleLog.showLog ("DoChinhXac of " + dinhdanh + " at " + thoigian + " has been updated to " + dochinhxac +'\n')
               flag = True
            else:
               self.consoleLog.showLog ("DoChinhXac of " + dinhdanh + " at " + thoigian + " has not been updated to \n")
               flag = False
        except requests.RequestException:
            self.consoleLog.showLog ('Sorry: Please check saveData API IS-Tech.\n')
            #raise Exception("Sorry: Please check saveData API IS-Tech.")
            flag = False
        return flag
		
    def callWSToUploadFile(self, fileName, pathfile):
        result = True
        self.consoleLog.showLog ("upload file: "+ pathfile + ' \n')
        fileImg = ''
        try:
            try:
               fileImg = open(pathfile, 'rb')
            except:
                with urllib.request.urlopen(self.urlFace) as response:
                    fileImg = response.read()
            files = {'file': fileImg}
            requests.post(self.apiWS + '/uploadWithFileName?fileName='+fileName, files = files)
            self.consoleLog.showLog ('uploadWithFileName OK')
        except requests.RequestException:
           self.consoleLog.showLog ('Error: Please check API '+ self.urlFace +'\n')
           result = False
        except FileNotFoundError:
            self.consoleLog.showLog (fileName + ' File not found\n')
            result = False
        else:
            self.consoleLog.showLog (fileName + ' has been uploaded successfully\n')
        return result

    def uploadFileExample(self, fileIamge):
        result = True
        fileName = 'test.jpg'
        try:
           files = {'file': fileIamge}
           requests.post(self.apiWS + '/uploadWithFileName?fileName='+fileName, files = files)
           self.consoleLog.showLog ('uploadWithFileName OK')
        except requests.RequestException:
           self.consoleLog.showLog ('Error: Please check API '+ self.urlFace +'\n')
           result = False
        except FileNotFoundError:
            self.consoleLog.showLog (fileName + ' File not found\n')
            result = False
        else:
            self.consoleLog.showLog (fileName + ' has been uploaded successfully\n')
        return result

    def saveQRCodeToFile(self, data):
        self.consoleLog.showLog(data)
        if os.path.exists(self.rootDir + "/qrcode.txt"):
          os.remove(self.rootDir + "/qrcode.txt")
        try:
            f = open(self.rootDir + "/qrcode.txt", "ab")
            f.write(data.encode())
            f.close()
        except:
            self.consoleLog.showLog("Error cannot write data to qrcode.txt")
        
    def readFromQRcode(self, data, diadiem, pathfile,dochinhxac=0):
        try:
            dtime = datetime.datetime.now()
            thoigian = str(int(dtime.timestamp()*1000))#dtime.strftime("%Y-%m-%d %H:%M:%S")
            thoigianOrg = str(dtime.strftime("%Y-%m-%d %H:%M:%S"))
            lstdata = data.split("\n")
            data = ''
            dinhdanh=''
            thongtin=''
            stop = False
            for item in lstdata:
                if stop == True:
                    break
                if re.search(",", item):
                   item = re.findall('(.*),', item)[0]
                   stop = True
                if re.search("ĐỊNH DANH:", item):
                   dinhdanh = re.findall('.*ĐỊNH DANH:? ([^ ]*)', item)[0]
                else:
                   thongtin = thongtin + " " + item.strip() + "."

            self.consoleLog.showLog('Calling get_info to get userID based on dinhdanh: ' + dinhdanh)
            userID, userName, mailFwdA = self.get_info(dinhdanh)
            if userID == False:
              userID = dinhdanh
            userID = str(userID)
            if mailFwdA == False:
               mailFwdA = dinhdanh.strip() 
            status = self.callWSToSendQRCode(userID, userName,mailFwdA, dinhdanh.strip(), thoigian, thongtin.strip(), diadiem,userID + "_" + thoigian + ".jpg",dochinhxac, pathfile, thoigianOrg)
            self.consoleLog.showLog('Check data update.....')
            self.consoleLog.showLog(status)
            if status == True:
               self.callWSToUploadFile(userID + "_" + thoigian + ".jpg", pathfile)
               self.callWSToShowPopup(dinhdanh,thongtin, thoigian, diadiem)

        except Exception as e:
            self.consoleLog.showLog ('Error: ' + str(e) + ' at readFromQRcode function of file WebServiceHelper.py\n')
    
    def readFromLDAP(self, faceID, diadiem, pathfile):
        try:
            dtime = datetime.datetime.now()
            thoigian = str(int(dtime.timestamp()*1000))
            thoigianOrg = str(dtime.strftime("%Y-%m-%d %H:%M:%S"))
            self.consoleLog.showLog ("faceID : " + faceID)
            lstdata  = faceID.split(" ")
            dinhdanh = ''
            thongtin = ''
            userID   = ''
            emailFwdTemp = ''
            id = (lstdata[len(lstdata) - 2]).strip()
            dochinhxac = (lstdata[len(lstdata) - 1]).strip()
            self.consoleLog.showLog ("ID : " + id + " dochinhxac: " + dochinhxac)
            if float(dochinhxac) < config.ACCURACY :
              self.consoleLog.showLog ('DoChinhXac is only ' + dochinhxac + ', the minimal regconition accuracy have to 60%')
            else:
                
                if re.search("@", id):
                   dinhdanh = str(id)
                else:
                   userID = str(id)
                self.consoleLog.showLog('Calling get_info to get userID based on dinhdanh: ' + str(id))
                userID, userName, mailFwdA = self.get_info(id)
                if userID == '':
                  userID = dinhdanh
                
                userID = str(userID)
                
                if mailFwdA == False and len(dinhdanh.strip()) >0 :
                   mailFwdA = dinhdanh
                if dinhdanh == '':
                    if len(mailFwdA.strip()) == 0:
                        dinhdanh = mailFwdA
                    else:
                        dinhdanh = userID
                
                thongtin = userName 
                
                if len(mailFwdA.strip()) <= 3:
                    mailFwdA = userID + '@is-tech.vn'
                    
                self.consoleLog.showLog ('dinhdanh: ' + dinhdanh + ',dochinhxac: ' + dochinhxac + ', userID: ' + userID + ', mailFW: ' + mailFwdA + ', len: ' + str(len(mailFwdA.strip())))   
                
                status = self.callWSToSendQRCode(userID, userName,mailFwdA, dinhdanh, thoigian, thongtin.strip(), diadiem,userID + "_" + thoigian + ".jpg",dochinhxac, pathfile, thoigianOrg)
                self.consoleLog.showLog('Check data update.....')
                self.consoleLog.showLog(status)
                if status == True:
                   self.callWSToUploadFile(userID + "_" + thoigian + ".jpg", pathfile)
                   self.callWSToShowPopup(dinhdanh,thongtin, thoigian, diadiem)

        except Exception as e:
            self.consoleLog.showLog ('Error: ' + str(e) + ' at readFromLDAP function of file WebServiceHelper.py\n')
