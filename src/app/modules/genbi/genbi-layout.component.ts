import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-genbi-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, LucideAngularModule],
  templateUrl: './genbi-layout.component.html',
  styleUrl: './genbi-layout.component.scss'
})
export class GenbiLayoutComponent {}