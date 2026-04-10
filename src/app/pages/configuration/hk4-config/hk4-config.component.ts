import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Hk4Service } from '../../../services/hk4.service';
import { Hk4SequenceDialogComponent } from './hk4-sequence-dialog/hk4-sequence-dialog.component';
import { StoreService } from '../../../services/store.service';
import { GongType } from '../../../model/gongType';

@Component({
    selector: 'app-hk4-config',
    templateUrl: './hk4-config.component.html',
    styleUrls: ['./hk4-config.component.scss']
})
export class Hk4ConfigComponent implements OnInit {
    isLoading = true;
    settings: any = null;
    sequencesKeys: string[] = [];
    gongTypes: GongType[] = [];

    constructor(
        private hk4Service: Hk4Service,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private storeService: StoreService
    ) { }

    ngOnInit(): void {
        this.gongTypes = this.storeService.getGongs();
        this.loadSettings();
    }

    loadSettings() {
        this.isLoading = true;
        this.hk4Service.getSettings().subscribe(
            (data) => {
                this.settings = data;
                this.updateSequencesList();
                this.isLoading = false;
            },
            (error) => {
                console.error('Error loading HK4 settings', error);
                this.snackBar.open('Error loading HK4 configurations', 'Close', { duration: 3000 });
                this.isLoading = false;
            }
        );
    }

    updateSequencesList() {
        if (this.settings && this.settings.sequences) {
            this.sequencesKeys = Object.keys(this.settings.sequences);
        } else {
            this.sequencesKeys = [];
        }
    }

    getGongName(gongTypeId: any): string {
        const gong = this.gongTypes.find(g => g.id == gongTypeId);
        return gong ? gong.name : String(gongTypeId);
    }

    getAreasDisplay(areas: number[]): string {
        if (!areas || areas.length === 0) return '';
        return areas.map(id => {
            const area = this.storeService.areasMap[id];
            return area ? area.name : id;
        }).join(', ');
    }

    addSequence() {
        this.openDialog();
    }

    editSequence(seqKey: string) {
        this.openDialog(seqKey, this.settings.sequences[seqKey]);
    }

    removeSequence(seqKey: string) {
        if (confirm(`Are you sure you want to delete sequence ${seqKey}?`)) {
            delete this.settings.sequences[seqKey];
            this.saveSettings('Sequence removed');
        }
    }

    openDialog(sequenceKey?: string, gongConfig?: any) {
        const dialogRef = this.dialog.open(Hk4SequenceDialogComponent, {
            width: '400px',
            data: { sequenceKey, gongConfig },
            disableClose: true // Force explicit cancel/save to manage BE lock
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // If it's an edit and the key changed, delete the old one
                if (result.originalSequenceKey && result.originalSequenceKey !== result.newSequenceKey) {
                    delete this.settings.sequences[result.originalSequenceKey];
                }

                if (!this.settings.sequences) {
                    this.settings.sequences = {};
                }

                this.settings.sequences[result.newSequenceKey] = result.gongConfig;
                this.saveSettings('Sequence saved successfully');
            }
        });
    }

    saveSettings(successMessage: string) {
        this.isLoading = true;
        this.hk4Service.saveSettings(this.settings).subscribe(
            (updatedSettings) => {
                this.settings = updatedSettings;
                this.updateSequencesList();
                this.snackBar.open(successMessage, 'Close', { duration: 3000 });
                this.isLoading = false;
            },
            (error) => {
                console.error('Error saving HK4 settings', error);
                this.snackBar.open('Error saving configurations', 'Close', { duration: 3000 });
                this.isLoading = false;
            }
        );
    }
}
