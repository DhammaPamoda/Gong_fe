import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { Hk4Service } from '../../../../services/hk4.service';
import { StoreService } from '../../../../services/store.service';
import { GongType } from '../../../../model/gongType';

const areasValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    const regex = /^([0-8](\s*,\s*[0-8])*)$/;
    return regex.test(value) ? null : { invalidAreas: true };
};

@Component({
    selector: 'app-hk4-sequence-dialog',
    templateUrl: './hk4-sequence-dialog.component.html',
    styleUrls: ['./hk4-sequence-dialog.component.scss']
})
export class Hk4SequenceDialogComponent implements OnInit, OnDestroy {
    form: FormGroup;
    isListening = false;
    originalSequenceKey: string;
    isEditMode: boolean;
    gongTypes: GongType[] = [];

    private keyPressSubscription: Subscription;
    private preRecordingSequence: string;

    constructor(
        public dialogRef: MatDialogRef<Hk4SequenceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private fb: FormBuilder,
        private hk4Service: Hk4Service,
        private storeService: StoreService,
        private snackBar: MatSnackBar
    ) {
        this.originalSequenceKey = data.sequenceKey || '';
        this.isEditMode = !!this.originalSequenceKey;

        this.form = this.fb.group({
            sequenceKey: [this.originalSequenceKey, Validators.required],
            gongType: [data.gongConfig?.gongType || null, Validators.required],
            areas: [data.gongConfig?.areas?.join(',') || '0', [Validators.required, areasValidator]],
            volume: [data.gongConfig?.volume || 100, [Validators.required, Validators.min(0), Validators.max(100)]],
            repeat: [data.gongConfig?.repeat || 1, [Validators.required, Validators.min(1)]]
        });

        this.gongTypes = this.storeService.getGongs();
    }

    ngOnInit(): void {
        // Disable BE HK4 logic while modal is open to avoid race condition
        this.hk4Service.setStatus(false).subscribe({
            error: (err) => {
                console.error('Failed to disable HK4 backend logic', err);
                this.snackBar.open('Warning: Could not disable backend HK4 logic.', 'Close', { duration: 3000 });
            }
        });
    }

    ngOnDestroy(): void {
        this.stopListening();
        // Re-enable BE HK4 logic when modal closes
        this.enableHk4Logic();
    }

    private enableHk4Logic() {
        this.hk4Service.setStatus(true).subscribe({
            error: (err) => console.error('Failed to re-enable HK4 backend logic', err)
        });
    }

    toggleListening() {
        this.isListening = !this.isListening;
        if (this.isListening) {
            this.preRecordingSequence = this.form.get('sequenceKey').value;
            this.form.patchValue({ sequenceKey: '' });
            this.keyPressSubscription = this.listenToGlobalKeydown();
        } else {
            const currentSeq = this.form.get('sequenceKey').value;
            if (currentSeq.length < 4) {
                this.form.patchValue({ sequenceKey: this.preRecordingSequence });
            }
            this.stopListening();
        }
    }

    private listenToGlobalKeydown(): Subscription {
        const handleKeydown = (event: KeyboardEvent) => {
            let key = event.key;
            // Map physical keyboard mappings for a,b,c,d to 1,2,3,4 if needed
            if (['a', 'A'].includes(key)) key = '1';
            if (['b', 'B'].includes(key)) key = '2';
            if (['c', 'C'].includes(key)) key = '3';
            if (['d', 'D'].includes(key)) key = '4';

            if (['1', '2', '3', '4'].includes(key)) {
                const currentSeq = this.form.get('sequenceKey').value || '';
                if (currentSeq.length < 4) {
                    this.form.patchValue({ sequenceKey: currentSeq + key });
                }
                if (currentSeq.length + 1 === 4) {
                    this.stopListening();
                }
            }
        };

        window.addEventListener('keydown', handleKeydown);
        return new Subscription(() => {
            window.removeEventListener('keydown', handleKeydown);
        });
    }

    stopListening() {
        this.isListening = false;
        if (this.keyPressSubscription) {
            this.keyPressSubscription.unsubscribe();
        }
    }

    clearSequence() {
        this.form.patchValue({ sequenceKey: '' });
    }

    save() {
        if (this.form.invalid) return;

        const val = this.form.value;
        const areasArray = val.areas.split(',').map(a => parseInt(a.trim(), 10)).filter(a => !isNaN(a));

        const result = {
            originalSequenceKey: this.originalSequenceKey,
            newSequenceKey: val.sequenceKey,
            gongConfig: {
                gongType: val.gongType,
                areas: areasArray,
                volume: val.volume,
                repeat: val.repeat
            }
        };
        this.dialogRef.close(result);
    }

    cancel() {
        this.dialogRef.close(null);
    }
}
