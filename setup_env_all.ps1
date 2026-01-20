$envs = @("production", "preview", "development")
$vars = @{
    "NEXT_PUBLIC_FIREBASE_API_KEY"             = "AIzaSyDk3mnCJcQoP3wCZ5ubi6Owvw6bZoSZ2_I";
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"         = "gpa-class-reports.firebaseapp.com";
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"          = "gpa-class-reports";
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"      = "gpa-class-reports.appspot.com";
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" = "932091328883";
    "NEXT_PUBLIC_FIREBASE_APP_ID"              = "y1:932091328883:web:d9fcf107d70638cc73ad06"
}

foreach ($env in $envs) {
    foreach ($key in $vars.Keys) {
        Write-Output $vars[$key] | npx vercel env add $key $env
    }
}
