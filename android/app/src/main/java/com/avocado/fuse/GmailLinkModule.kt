package com.avocado.fuse

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class GmailLinkModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "GmailLauncher"

  @ReactMethod
  fun open(url: String, promise: Promise) {
    try {
      val uri = Uri.parse(url)
      require(uri.scheme == "https" && uri.host == "mail.google.com" && uri.userInfo == null && uri.port == -1 &&
        uri.path?.startsWith("/mail/u/") == true && uri.fragment?.startsWith("search/") == true) {
        "Invalid source email URL"
      }
      // setPackage is essential: a generic ACTION_VIEW can launch the browser.
      val intent = Intent(Intent.ACTION_VIEW, uri)
        .setPackage("com.google.android.gm")
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      if (intent.resolveActivity(context.packageManager) == null) {
        throw ActivityNotFoundException("Gmail cannot handle this email URL")
      }
      context.startActivity(intent)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("GMAIL_OPEN_FAILED", "Gmail could not open this email", error)
    }
  }
}
