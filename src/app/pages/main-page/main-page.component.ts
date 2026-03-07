import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { StoreService } from '../../services/store.service';

import { AuthService } from '../../services/auth.service';
import { SystemSettingsService } from '../../services/system-settings.service';
import { NotificationTypesEnum } from '../../json-editor/shared/dataModels/lang.model';
import { BaseComponent } from '../../shared/baseComponent';
import { takeUntil } from 'rxjs/operators';

interface TransResponseInt {
  data: { translations: Array<{ translatedText: string }> };
}

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent extends BaseComponent {

  loggedInRole: string;

  apiKey = '';
  url = 'https://translation.googleapis.com/language/translate/v2/';

  viewManualPermissions: boolean;
  viewAutomaticPermissions: boolean;
  viewConfigPermissions: boolean;

  isSecurityCheckRunning: boolean = false;

  constructor(private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private storeService: StoreService,
    private systemSettingsService: SystemSettingsService) {
    super();
  }



  // Event handler for window focus
  private handleWindowFocus = () => {
    // this.getBasicData();
    console.log('focus log');
    if (!this.firstTime) {
      this.storeService.getBasicData();
    } else {
      this.firstTime = false;
    }
  };

  protected hookOnInit() {
    if (!this.authService.loggedIn) {
      this.router.navigate(['loginPage']);
    } else {
      this.loggedInRole = this.authService.getRole();
      this.storeService.readToStore();
      this.checkSystemSettings();
    }
    // 🔹 Add focus listener to refresh server time on tab/window focus
    window.addEventListener('focus', this.handleWindowFocus);
  }

  checkSystemSettings() {
    this.systemSettingsService.getSettings().subscribe(settings => {
      this.isSecurityCheckRunning = settings && settings.runSecurityCheck;
    });
  }

  private firstTime: boolean = true;
  protected listenForUpdates() {
    this.authService.hasPermission('view_manual')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.viewManualPermissions = isPermitted);
    this.authService.hasPermission('view_automatic')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.viewAutomaticPermissions = isPermitted);
    this.authService.hasPermission('view_config')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.viewConfigPermissions = isPermitted);
  }

  getTranslateMethod() {
    return this.googleTranslateMethod.bind(this);
  }

  googleTranslateMethod(aSourceStrings: Array<string>, aTargetLang: string): Promise<Array<string>> {
    // let params = new HttpParams();
    // aSourceStrings.forEach(sourceString => params = params.append('q', sourceString));
    // params = params.append('source', 'en');
    // params = params.append('target', aTargetLang);
    // params = params.append('key', this.apiKey);
    //
    // return new Promise((resolve, reject) => {
    //   this.http.get(this.url, {params: params})
    //     .subscribe((response: TransResponseInt) => {
    //       const transArray = response.data.translations.map(trans => trans.translatedText);
    //       resolve(transArray);
    //     });
    // });

    const retValue = aSourceStrings.map(sourceString => sourceString + '_' + aTargetLang);
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(retValue), 50);
    });
  }

  languagesMapUpdateReceived(aReceivedLangMap: Map<string, any>) {
    console.log('languagesMapUpdateReceived ', aReceivedLangMap);
  }

  jsonEditorMessageReceived(aMessagesEnum: NotificationTypesEnum) {
    // console.log(`jsonEditorMessageReceived was activated with value ${aMessagesEnum}`);
  }

  isAdmin(): boolean {
    return ['admin', 'dev'].includes(this.authService.getRole());
  }
}
