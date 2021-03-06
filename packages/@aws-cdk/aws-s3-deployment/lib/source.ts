import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3_assets from '@aws-cdk/aws-s3-assets';
import * as cdk from '@aws-cdk/core';

export interface SourceConfig {
  /**
   * The source bucket to deploy from.
   */
  readonly bucket: s3.IBucket;

  /**
   * An S3 object key in the source bucket that points to a zip file.
   */
  readonly zipObjectKey: string;
}

/**
 * Bind context for ISources
 */
export interface DeploymentSourceContext {
  /**
   * The role for the handler
   */
  readonly handlerRole: iam.IRole;
}

/**
 * Represents a source for bucket deployments.
 */
export interface ISource {
  /**
   * Binds the source to a bucket deployment.
   * @param scope The construct tree context.
   */
  bind(scope: cdk.Construct, context?: DeploymentSourceContext): SourceConfig;
}

/**
 * Specifies bucket deployment source.
 *
 * Usage:
 *
 *     Source.bucket(bucket, key)
 *     Source.asset('/local/path/to/directory')
 *     Source.asset('/local/path/to/a/file.zip')
 *
 */
export class Source {
  /**
   * Uses a .zip file stored in an S3 bucket as the source for the destination bucket contents.
   * @param bucket The S3 Bucket
   * @param zipObjectKey The S3 object key of the zip file with contents
   */
  public static bucket(bucket: s3.IBucket, zipObjectKey: string): ISource {
    return {
      bind: (_: cdk.Construct, context?: DeploymentSourceContext) => {
        if (!context) {
          throw new Error('To use a Source.bucket(), context must be provided');
        }

        bucket.grantRead(context.handlerRole);
        return { bucket, zipObjectKey };
      },
    };
  }

  /**
   * Uses a local asset as the deployment source.
   * @param path The path to a local .zip file or a directory
   */
  public static asset(path: string, options?: s3_assets.AssetOptions): ISource {
    return {
      bind(scope: cdk.Construct, context?: DeploymentSourceContext): SourceConfig {
        if (!context) {
          throw new Error('To use a Source.asset(), context must be provided');
        }

        let id = 1;
        while (scope.node.tryFindChild(`Asset${id}`)) {
          id++;
        }
        const asset = new s3_assets.Asset(scope, `Asset${id}`, {
          path,
          ...options,
        });
        if (!asset.isZipArchive) {
          throw new Error('Asset path must be either a .zip file or a directory');
        }
        asset.grantRead(context.handlerRole);

        return {
          bucket: asset.bucket,
          zipObjectKey: asset.s3ObjectKey,
        };
      },
    };
  }

  private constructor() { }
}
