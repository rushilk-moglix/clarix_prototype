import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MicrosoftLoginProvider, SocialAuthService } from '@abacritt/angularx-social-login';
import { filter, from, switchMap, tap } from 'rxjs';
import { AuthService } from '../core/auth/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  public isLoading = signal(false);

  /**
   * Resting heights (%) of the waveform bars in the hero illustration. A fixed, hand-tuned shape
   * rather than random values: it reads as speech, and it renders identically on every visit.
   */
  protected readonly waveBars = [
    18, 26, 38, 30, 52, 68, 46, 34, 60, 44, 28, 50, 72, 58,
    36, 48, 66, 84, 62, 40, 54, 42, 26, 34, 50, 70, 90, 66,
    44, 30, 42, 58, 74, 52, 36, 46, 62, 80, 58, 38, 50, 34,
    24, 32, 48, 64, 46, 30, 40, 54, 70, 50, 34, 26, 20, 16,
  ];

  async handleMicrosoftLogin(): Promise<void> {
    this.isLoading.set(true);
    await this.authService.login();
    this.isLoading.set(false);
  }
}
