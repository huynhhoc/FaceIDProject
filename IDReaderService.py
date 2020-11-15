#!/usr/bin/env python3
# -*- coding: utf-8 -*-
__author__="hthoc@...."
__date__ ="$05-01-2019$"

from WebServiceHelper import WebServiceHelper
from LogFile import LogFile
import re
import sys

#default values logfile, apiWS,urlPopUp, urlFace

def init():
    try:
        fileConfig = open("/etc/itd/cloudcam/ID-Reader/config.xml", "r")
        for line in fileConfig:
          if re.search("logfile", line):
              logfile = line.split("=")[1].strip()
          elif re.search("urlFace", line):
              urlFace = line.split("=")[1].strip()
          elif re.search("apiWS", line):
              apiWS = line.split("=")[1].strip()
          elif re.search("urlPopUp", line):
              urlPopUp = line.split("=")[1].strip()
          elif re.search("diadiem", line):
              diadiem = line.split("=")[1].strip()
          else:
              print ("Invalid config.xml")
    except FileNotFoundError as e:
        print ("config.xml find not found")
    except IndexError as e:
        print ("Format Error in config.xml")
    else:
        fileConfig.close()

def main(qrcode, pathfileImage):
    wsHelper = WebServiceHelper(logfile, apiWS,urlPopUp, urlFace)
    wsHelper.readFromQRcode(qrcode,diadiem, pathfileImage)

if __name__ == '__main__':
    init()
    if len(sys.argv) >= 3:
        pathfileImage = sys.argv[1]
        qrcode = sys.argv[2]
        main(qrcode,pathfileImage)
    else:
        consoleLog = LogFile(logfile)
        consoleLog.showLog ('Please make sure arguments are correctly: %JPEG% %QR% \n')
    sys.exit()