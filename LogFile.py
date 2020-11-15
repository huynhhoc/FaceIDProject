#!/usr/bin/env python3
# -*- coding: utf-8 -*-
__author__="hthoc@..."
__date__ ="$02-01-2019$"

import datetime
class LogFile:
    def __init__(self, fileLogName):
        self.fileLogName = fileLogName
    def showLog(self, logMessage):
        try:
            f = open(self.fileLogName, "ab")
            message = '['+str(datetime.datetime.now()) + "]: " + str(logMessage) + "\n"
            f.write(message.encode())
            print(message)
            f.close()
        except Exception as e:
            print("Something went wrong when writing to the log file", e)
            #f.write(str(e).encode())

    def writeToFile(self, message):
        try:
            f = open(self.fileLogName, "ab")
            message = message + "\n"
            f.write(message.encode())
            f.close()
        except Exception as e:
            print("Something went wrong when writing to the file", e)
            #f.write(str(e).encode())
