This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

This project requires several environment variables to be set up for full functionality:

1. Copy `.env.local.sample` to `.env.local` and fill in your API keys:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `NEXT_PUBLIC_VAPI_API_KEY` - Your VAPI API key (for voice agent functionality)

## Deployment on Vercel

The project is optimized for deployment on Vercel. Follow these steps to deploy:

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Visit [Vercel](https://vercel.com/new) and import your repository
3. Configure your project:
   - Set the framework preset to "Next.js"
   - Add all required environment variables from your `.env.local` file
   - Click "Deploy"

### Vercel Production Deployment

For production deployment, use the following command if deploying from the CLI:

```bash
vercel --prod
```

The project includes a properly configured `vercel.json` file that sets up:
- Build and development commands
- Output directory
- Framework detection
- Region configuration

### Static Files

Static files like `test.html` are placed in the `public` directory and can be accessed directly at the root URL path (e.g., `https://your-domain.com/test.html`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
