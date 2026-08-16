import { Component, HostListener } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
// import {MatIconRegistry} from '@angular/material/icon';

import { NgRedux } from '@angular-redux/store';
import { filter, takeUntil } from 'rxjs/operators';

import { BaseComponent } from './shared/baseComponent';
import { DbObjectTypeEnum, IndexedDbService } from './shared/indexed-db.service';
import { StoreDataTypeEnum } from './store/storeDataTypeEnum';
import { AuthService } from './services/auth.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends BaseComponent {


  constructor(
    private ngRedux: NgRedux<any>,
    private indexedDbService: IndexedDbService,
    private domSanitizer: DomSanitizer,
    private authService: AuthService) {

    super();
  }

  @HostListener('window:focus')
  onWindowFocus() {
    this.authService.verifyAuthOnFocus();
  }
}
