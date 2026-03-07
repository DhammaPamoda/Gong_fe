import { Component, ComponentFactoryResolver, ViewChild } from '@angular/core';

import { NgRedux } from '@angular-redux/store';

import { AuthService } from '../../services/auth.service';
import { ConfigPageHostDirective } from '../../shared/config-page-host.directive';
import { BaseComponent } from '../../shared/baseComponent';
import { DeviceSetupComponent } from './device-setup/device-setup.component';
import { I18nEditingComponent } from './i18n-editing/i18n-editing.component';
import { LanguagesComponent } from './languages/languages.component';
import { PermissionsComponent } from './permissions/permissions.component';
import { UsersComponent } from './users/users.component';
import { SystemSettingsComponent } from './system-settings/system-settings.component';

interface IComponentRecord {
  name: string;
  component: any;
}

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent extends BaseComponent {

  @ViewChild(ConfigPageHostDirective, { static: true }) mainConfigTemplateCtrl: ConfigPageHostDirective;

  componentsArray: IComponentRecord[] = [];
  selectedComponent: IComponentRecord;

  constructor(
    ngRedux: NgRedux<any>,
    authService: AuthService,
    private componentFactoryResolver: ComponentFactoryResolver) {
    super(null, ngRedux, authService);

  }

  protected hookOnInit() {
    this.constructComponentsArray();
    this.displayComponent(this.selectedComponent);
  }

  private constructComponentsArray() {
    this.componentsArray.push({ name: 'i18n', component: I18nEditingComponent });
    this.componentsArray.push({ name: 'permissions', component: PermissionsComponent });
    this.componentsArray.push({ name: 'users', component: UsersComponent });
    this.componentsArray.push({ name: 'languages', component: LanguagesComponent });
    if (this.currentRole === 'dev') {
      this.componentsArray.push({ name: 'deviceSetup', component: DeviceSetupComponent });
    }
    this.componentsArray.push({ name: 'systemSettings', component: SystemSettingsComponent });
    this.selectedComponent = this.componentsArray[0];
  }

  displayComponent(aComponent: IComponentRecord) {
    this.selectedComponent = aComponent;

    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(aComponent.component);

    const viewContainerRef = this.mainConfigTemplateCtrl.viewContainerRef;
    viewContainerRef.clear();

    const componentRef = viewContainerRef.createComponent(componentFactory);
    // (<AdComponent>componentRef.instance).data = adItem.data;
  }

}
