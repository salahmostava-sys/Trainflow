# فحص TrainFlow باستخدام Sonar

إعداد نطاق الفحص موجود في `sonar-project.properties`. يشمل مصادر التطبيق والإضافة وأداة Google Apps Script (`.gs`) ويصنّف مجلد `tests` كاختبارات. يستبعد ملفات البناء والنسخ المولّدة من الكود، ولا يستبعد مشاكل أو قواعد فحص من الكود الأصلي.

يلزم رابط سيرفر Sonar وProject Key للمشروع الموجود، وتوكن لديه صلاحية Execute Analysis. عند استخدام SonarQube Cloud يلزم أيضًا Organization Key. لا تضع التوكن في ملف الإعدادات أو Git أو المحادثة؛ يستخدم SonarScanner متغير البيئة `SONAR_TOKEN`.

SonarScanner CLI 8.1.0.6389 مثبّت محليًا في Windows تحت `%LOCALAPPDATA%\TrainFlowTools\sonar-scanner`. من مجلد المشروع، بعد ضبط `SONAR_HOST_URL` و`SONAR_PROJECT_KEY` و`SONAR_TOKEN` في بيئة PowerShell الحالية:

```powershell
$sonarScannerCommand = Join-Path $env:LOCALAPPDATA 'TrainFlowTools/sonar-scanner/sonar-scanner-8.1.0.6389-windows-x64/bin/sonar-scanner.bat'
& $sonarScannerCommand "-Dsonar.projectKey=$env:SONAR_PROJECT_KEY" '-Dsonar.qualitygate.wait=true'
```

في SonarQube Cloud، أضف `"-Dsonar.organization=$env:SONAR_ORGANIZATION"` إلى الأمر. استخدم عنوان المنطقة الصحيح لمشروعك. إذا كان Automatic Analysis مفعّلًا للمشروع، اختر طريقة تحليل واحدة متوافقة مع إعدادات Sonar قبل تشغيل الفحص عبر CLI أو CI.

لا يوجد تقرير LCOV مُعدّ لهذا المشروع حاليًا؛ وجود اختبارات ناجحة لا يعني أن Sonar قاس تغطيتها. تقرير التغطية يحتاج إنتاج LCOV منفصلًا قبل إعداد `sonar.javascript.lcov.reportPaths`. لا يتم تعطيل شرط التغطية في Quality Gate لإخفاء هذه النقطة.

نتيجة الفحص الفعلية وQuality Gate تظهران على سيرفر Sonar بعد انتهاء معالجة التحليل. تشغيل `--version` يتحقق من أداة الفحص فقط. عند انتظار Quality Gate، قد ينتهي الأمر بخطأ لأن البوابة لم تنجح، حتى لو تم رفع التحليل بنجاح.

المراجع: [SonarScanner CLI](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner) و[نطاق المصادر والاختبارات](https://docs.sonarsource.com/sonarqube-community-build/project-administration/adjusting-analysis/setting-analysis-scope/setting-initial-scope).
