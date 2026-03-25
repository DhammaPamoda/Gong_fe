import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


import { ETopic, ITopicData } from '../../model/topics-model';
import { BaseComponent } from '../../shared/baseComponent';


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


  topic: string = '';
  disabledTopicToolTip: string = '';

  constructor(public dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public data: { topic: ETopic, availableTopics: ITopicData[], forAction: EAction, many: boolean }) {
    super();
  }

  protected hookOnInit() {
    const topic = this.titles.dialogs.selectTopics.topics[this.data.topic];
    const many = this.data.many ? this.titles.dialogs.selectTopics.topics.many : '';
    this.topic = `${topic}${many}`;
    this.disabledTopicToolTip = this.titles.dialogs.selectTopics.tooltips.inUse[this.data.topic];
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

  getTopicReplacedHeader(): string {
    const rawHeader = this.titles.dialogs.selectTopics.header[this.data.forAction];
    return rawHeader ? rawHeader.replace('{{topic}}', this.topic) : '';
  }
}
