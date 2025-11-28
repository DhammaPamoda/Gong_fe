import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

import {TranslateService} from '@ngx-translate/core';

import {ETopic, ITopicData} from '../../model/topics-model';
import {BaseComponent} from '../../shared/baseComponent';


export enum EAction {
  DOWNLOAD = 'download',
  UPDATE = 'update',
  DELETE = 'delete',
}

@Component({
  selector: 'app-select-courses-dialog',
  templateUrl: './select-topics-dialog.component.html',
  styleUrls: ['./select-topics-dialog.component.scss']
})
export class SelectTopicsDialogComponent extends BaseComponent {

  selectedTopics: ITopicData[] = [];

  keysArray: string[] = [];
  topic: string = '';
  disabledTopicToolTip: string = '';

  constructor(public dialogRef: MatDialogRef<any>,
              @Inject(MAT_DIALOG_DATA) public data: { topic: ETopic, availableTopics: ITopicData[], forAction: EAction, many: boolean },
              translateService: TranslateService) {
    super(translateService);
  }

  protected getKeysArray4Translations(): string[] {
    this.keysArray.push(`dialogs.selectTopics.topics.${this.data.topic}`);
    this.keysArray.push('dialogs.selectTopics.topics.many');
    this.keysArray.push(`dialogs.selectTopics.tooltips.inUse.${this.data.topic}`);
    return this.keysArray;
  }

  protected hookOnInit() {
    const topic = this.translationMap.get(this.keysArray[0]);
    const many = this.data.many ? this.translationMap.get(this.keysArray[1]) : '';
    this.topic = `${topic}${many}`;
    this.disabledTopicToolTip = this.translationMap.get(this.keysArray[2]);
  }

  closeDialog(aSelectedTopics: ITopicData[] = null): void {
    this.dialogRef.close(aSelectedTopics);
  }

  submit() {
    if (this.selectedTopics.length > 0) {
      this.closeDialog(this.selectedTopics);
    }
  }

  toggleSelection(aClickedTopic: ITopicData) {
    const topicIndex = this.selectedTopics.indexOf(aClickedTopic);
    if (topicIndex >= 0) {
      this.selectedTopics.splice(topicIndex, 1);
    } else {
      this.selectedTopics.push(aClickedTopic);
    }
  }
}
