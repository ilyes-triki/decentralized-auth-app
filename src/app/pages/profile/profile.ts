import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api'; // 👈 ADD

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  user: any;

  constructor(
    private auth: AuthService,
    private router: Router,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();

    this.api.testBackend().then((res) => console.log(res));
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
