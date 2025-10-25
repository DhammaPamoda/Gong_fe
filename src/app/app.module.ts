import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BrowserModule, DomSanitizer} from '@angular/platform-browser';
import {HttpClientModule, HTTP_INTERCEPTORS} from '@angular/common/http';
import {ServiceWorkerModule} from '@angular/service-worker';
import {MatIconRegistry} from '@angular/material/icon';

import {DevToolsExtension, NgRedux, NgReduxModule} from '@angular-redux/store';
import {applyMiddleware, combineReducers, createStore, Store} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import {JwtModule} from '@auth0/angular-jwt';
import {MissingTranslationHandler, TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {MomentModule} from 'ngx-moment';

import {MaterialModule} from './material/material.module';

import {JsonEditorModule} from './json-editor/json-editor.module';

import {
  AngularJsonClassConverterModule,
  IJsonConverterConfigFactory,
  JsonConverterConfigurationInterface
} from 'angular-json-class-converter';

import {RoutingModule} from './routing/routing.module';

import {environment} from '../environments/environment';
import {ServerCachedLoaderFactory} from './translation/server-cached.translate.loader';
import {CustomMissingTranslationHandlerFactory} from './translation/missing-translation.handler';
import {IndexedDbService} from './shared/indexed-db.service';

import {GeneralMiddlewareService} from './store/middleware/feature/general.mid';
import {ApiMiddlewareService} from './store/middleware/core/api.mid';
import {StoreDataTypeEnum} from './store/storeDataTypeEnum';
import {generalReducer} from './store/reducers/general.reducer';
import {dynamicDataReducer} from './store/reducers/dynamic.data.reducer';
import {staticDataReducer} from './store/reducers/static.data.reducer';
import {innerReducer} from './store/reducers/inner.data.reducer';

import {default as jsonConvConfigUtil} from './utils/json-converter-config/jsonConvConfigUtil';
import localConversionSchema from './utils/json-converter-config/gong-conversion-schema.json';

import {MaxDirective, MinDirective} from './shared/min-max.directive';
import {ConfigPageHostDirective} from './shared/config-page-host.directive';

import {AppComponent} from './app.component';

import {ManualActivationComponent} from './pages/manual-activation/manual-activation.component';
import {AutomaticActivationComponent} from './pages/automatic-activation/automatic-activation.component';
import {LoginComponent} from './pages/login/login.component';
import {ConfigurationComponent} from './pages/configuration/configuration.component';
import {DeviceSetupComponent} from './pages/configuration/device-setup/device-setup.component';
import {I18nEditingComponent} from './pages/configuration/i18n-editing/i18n-editing.component';
import {MainPageComponent} from './pages/main-page/main-page.component';

import {HeaderComponent} from './components/header/header.component';
import {SelectedAreasComponent} from './components/selected-areas/selected-areas.component';
import {GongsTimeTableComponent} from './components/gongs-time-table/gongs-time-table.component';

import {ScheduleCourseDialogComponent} from './dialogs/schedule-course-dialog/schedule-course-dialog.component';
import {SelectTopicsDialogComponent} from './dialogs/select-topics-dialog/select-topics-dialog.component';
import { LanguagesComponent } from './pages/configuration/languages/languages.component';
import { PermissionsComponent } from './pages/configuration/permissions/permissions.component';
import { UsersComponent } from './pages/configuration/users/users.component';
import { EditUserDialogComponent } from './dialogs/edit-user-dialog/edit-user-dialog.component';
import { JwtInterceptor } from './auth/jwt.interceptor';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

export const translationRoot = {
  loader: {
    provide: TranslateLoader,
    useFactory: ServerCachedLoaderFactory,
    deps: [IndexedDbService]
  },
  missingTranslationHandler: {
    provide: MissingTranslationHandler,
    useFactory: CustomMissingTranslationHandlerFactory,
    deps: [NgRedux]
  },
};

export function getConfig(): JsonConverterConfigurationInterface {
  return {
    conversionSchema: localConversionSchema,
    conversionFunctionsMapArray: jsonConvConfigUtil.functionsMapArray,
    classesMapArray: jsonConvConfigUtil.classesMapArray
  };
}

const jsonConverterConfig: IJsonConverterConfigFactory = {getConfig};

@NgModule({
  declarations: [
    AppComponent,
    ManualActivationComponent,
    AutomaticActivationComponent,
    SelectedAreasComponent,
    GongsTimeTableComponent,
    LoginComponent,
    MainPageComponent,
    ScheduleCourseDialogComponent,
    MinDirective,
    MaxDirective,
    HeaderComponent,
    SelectTopicsDialogComponent,
    ConfigurationComponent,
    DeviceSetupComponent,
    I18nEditingComponent,
    ConfigPageHostDirective,
    LanguagesComponent,
    PermissionsComponent,
    UsersComponent,
    EditUserDialogComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    ServiceWorkerModule.register('/ngsw-worker.js', {enabled: environment.production}),
    NgReduxModule,
    HttpClientModule,
    TranslateModule.forRoot(translationRoot),
    RoutingModule,
    MomentModule,
    AngularJsonClassConverterModule.forRoot(jsonConverterConfig),
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        whitelistedDomains: ['api'],
        blacklistedRoutes: ['api/login', 'api/nextgong']
      }
    }),
    JsonEditorModule,
  ],
  entryComponents: [
    ScheduleCourseDialogComponent,
    SelectTopicsDialogComponent,
    EditUserDialogComponent,
    DeviceSetupComponent,
    I18nEditingComponent,
    LanguagesComponent,
    PermissionsComponent,
    UsersComponent,
  ],
  providers: [
    ApiMiddlewareService, 
    GeneralMiddlewareService,
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})

export class AppModule {

  constructor(private ngRedux: NgRedux<any>,
              private devTools: DevToolsExtension,
              generalMiddlewareService: GeneralMiddlewareService,
              apiMiddlewareService: ApiMiddlewareService,
              matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {

    matIconRegistry.addSvgIconSet(domSanitizer.bypassSecurityTrustResourceUrl('./assets/icons/mdi.svg'));

    // ***********************************************
    // ************* Redux Init **********************
    // ***********************************************

    // ************* Middleware **********************
    // ***********************************************
    const featureMiddleware = [
      generalMiddlewareService.generalMiddleware,
    ];

    const coreMiddleware = [
      apiMiddlewareService.apiMiddleware,
    ];

    // ************* Reducers   **********************
    // ***********************************************
    const rootReducer = combineReducers({
      [StoreDataTypeEnum.GENERAL]: generalReducer,
      [StoreDataTypeEnum.STATIC_DATA]: staticDataReducer,
      [StoreDataTypeEnum.DYNAMIC_DATA]: dynamicDataReducer,
      [StoreDataTypeEnum.INNER_DATA]: innerReducer,
    });

    // ************* Store Creation ******************
    // ***********************************************
    const store: Store = createStore(
      rootReducer,
      composeWithDevTools(
        applyMiddleware(...featureMiddleware, ...coreMiddleware)
      )
    );

    ngRedux.provideStore(store);
  }
}
