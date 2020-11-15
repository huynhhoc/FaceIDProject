#!/usr/bin/env python3
# -*- coding: utf-8 -*-
__author__="hthoc@..."
__date__ ="$05-01-2019$"

from WebServiceHelper import WebServiceHelper
from LogFile import LogFile
import re
import sys

rootDir = "/etc/itd/cloudcam/ID-Reader"
logfile = rootDir + "/consolelogs.log"
def init():
    try:
        fileConfig = open(wsHelper.rootDir + "/config.xml", "r")
        for line in fileConfig:
          if re.search("logfile", line):
              logfile = line.split("=")[1].strip()
              break
    except FileNotFoundError as e:
        print ("config.xml find not found")
    except IndexError as e:
        print ("Format Error in config.xml")
    else:
        fileConfig.close()

if __name__ == '__main__':
    wsHelper = WebServiceHelper(logfile, "","", "", rootDir)
    #default values logfile
    logfile  = wsHelper.rootDir + '/consolelogs.log'
    init()
    consoleLog = LogFile(logfile)
    if len(sys.argv) >= 2:
        qrcode = sys.argv[1]
        wsHelper.saveQRCodeToFile(qrcode)
        consoleLog.showLog (qrcode)
    else:
        consoleLog.showLog ('Please make sure arguments are correctly: %QR% \n')
    sys.exit()
